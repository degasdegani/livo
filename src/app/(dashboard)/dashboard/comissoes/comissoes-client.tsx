// src/app/(dashboard)/dashboard/comissoes/comissoes-client.tsx
"use client";

import { MemberRole } from "@prisma/client";
import { AlertTriangle, Settings } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getComissoesData, type ResumoProf } from "../comandas/actions";
import {
  getProfessionalItemCommissions,
  updateProfessionalItemCommissions,
} from "./actions";
import { updateMembershipComissao } from "../settings/actions";

type Profissional = { id: string; name: string };
// Comissão agora vive em Professional — membershipRole indica se essa pessoa
// é a dona da barbearia (sem comissão configurável) ou null (sem login ainda).
type ProfessionalCommission = {
  id: string;
  name: string;
  membershipRole: MemberRole | null;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
  commissionServicePct: unknown;
  commissionProductPct: unknown;
};
type Props = {
  resumoInicial: ResumoProf[];
  profissionais: Profissional[];
  professionalsComPct: ProfessionalCommission[];
  dataInicio: Date;
  dataFim: Date;
  role: MemberRole;
  myProfessionalId: string | null;
};

const PERIODOS = [
  { value: "mes_atual", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "ultimos_30", label: "Últimos 30 dias" },
  { value: "ultimos_90", label: "Últimos 90 dias" },
] as const;
type Periodo = (typeof PERIODOS)[number]["value"];

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}


export function ComissoesClient({
  resumoInicial,
  profissionais,
  professionalsComPct,
  dataInicio,
  dataFim,
  role,
  myProfessionalId,
}: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const [filtroProf, setFiltroProf] = useState<string>("todos");
  const [resumo, setResumo] = useState<ResumoProf[]>(resumoInicial);
  const [isPending, startTransition] = useTransition();
  const [editingProfessional, setEditingProfessional] =
    useState<ProfessionalCommission | null>(null);
  const [editServicePct, setEditServicePct] = useState("");
  const [editProductPct, setEditProductPct] = useState("");
  const [editOnServices, setEditOnServices] = useState(false);
  const [editOnProducts, setEditOnProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [itemCommExpanded, setItemCommExpanded] = useState(false);
  const [itemCommData, setItemCommData] = useState<{
    services: { id: string; name: string; override: number | null }[];
    products: { id: string; name: string; override: number | null }[];
  } | null>(null);
  const [itemCommEdits, setItemCommEdits] = useState<Record<string, string>>({});
  const [loadingItemComm, setLoadingItemComm] = useState(false);
  const { toast } = useToast();

  void dataInicio;
  void dataFim;

  function abrirEdit(p: ProfessionalCommission) {
    setEditingProfessional(p);
    setEditOnServices(p.commissionOnServices);
    setEditOnProducts(p.commissionOnProducts);
    setEditServicePct(toNumber(p.commissionServicePct).toString() || "");
    setEditProductPct(toNumber(p.commissionProductPct).toString() || "");
    setSaveError("");
    setItemCommExpanded(false);
    setItemCommData(null);
    setItemCommEdits({});
  }
  function fecharEdit() {
    setEditingProfessional(null);
    setSaveError("");
    setItemCommExpanded(false);
    setItemCommData(null);
    setItemCommEdits({});
  }

  async function loadItemCommissions(professionalId: string) {
    setLoadingItemComm(true);
    try {
      const data = await getProfessionalItemCommissions(professionalId);
      setItemCommData(data);
      const edits: Record<string, string> = {};
      data.services.forEach((s) => {
        edits[`svc:${s.id}`] = s.override !== null ? String(s.override) : "";
      });
      data.products.forEach((p) => {
        edits[`prd:${p.id}`] = p.override !== null ? String(p.override) : "";
      });
      setItemCommEdits(edits);
    } finally {
      setLoadingItemComm(false);
    }
  }

  async function salvarPct() {
    if (!editingProfessional) return;
    setSaving(true);
    setSaveError("");
    try {
      const resultado = await updateMembershipComissao({
        professionalId: editingProfessional.id,
        commissionOnServices: editOnServices,
        commissionOnProducts: editOnProducts,
        commissionServicePct: editOnServices
          ? parseFloat(editServicePct) || null
          : null,
        commissionProductPct: editOnProducts
          ? parseFloat(editProductPct) || null
          : null,
      });

      if (itemCommData) {
        const overrides = [
          ...itemCommData.services.map((s) => ({
            type: "service" as const,
            itemId: s.id,
            commissionPct: parseFloat(itemCommEdits[`svc:${s.id}`]) || null,
          })),
          ...itemCommData.products.map((p) => ({
            type: "product" as const,
            itemId: p.id,
            commissionPct: parseFloat(itemCommEdits[`prd:${p.id}`]) || null,
          })),
        ];
        await updateProfessionalItemCommissions(editingProfessional.id, overrides);
      }

      fecharEdit();
      if (resultado.atualizados > 0) {
        toast(
          `Comissão salva! ${resultado.atualizados} atendimento${resultado.atualizados !== 1 ? "s" : ""} anterior${resultado.atualizados !== 1 ? "es" : ""} foram recalculados.`,
          "success",
        );
      } else {
        toast("Comissão salva com sucesso.", "success");
      }
      buscarDados(periodo, filtroProf);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function buscarDados(p: Periodo, profId?: string) {
    startTransition(async () => {
      const res = await getComissoesData(
        p,
        profId === "todos" ? undefined : profId,
      );
      setResumo(res.resumo as ResumoProf[]);
    });
  }
  function onPeriodoChange(p: Periodo) {
    setPeriodo(p);
    buscarDados(p, filtroProf);
  }
  function onProfChange(profId: string) {
    setFiltroProf(profId);
    buscarDados(periodo, profId);
  }

  const resumoFiltrado =
    role === MemberRole.barber && myProfessionalId
      ? resumo.filter((r) => r.professionalId === myProfessionalId)
      : filtroProf !== "todos"
        ? resumo.filter((r) => r.professionalId === filtroProf)
        : resumo;

  const totalGeral = resumoFiltrado.reduce((s, r) => s + r.totalComissao, 0);
  const totalFaturamento = resumoFiltrado.reduce(
    (s, r) => s + r.totalFaturamento,
    0,
  );
  // Owner nunca aparece na lista de comissões
  const profissionaisComissionaveis = professionalsComPct.filter(
    (p) => p.membershipRole !== MemberRole.owner,
  );

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Comissões
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {role === MemberRole.barber
              ? "Suas comissões por período"
              : "Comissões por profissional"}
          </p>
        </div>
        {role === MemberRole.owner && profissionaisComissionaveis.length > 0 && (
          <button
            onClick={() => abrirEdit(profissionaisComissionaveis[0])}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <Settings size={14} className="inline mr-1" />Configurar percentuais
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodoChange(p.value)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={
                periodo === p.value
                  ? {
                      backgroundColor: "var(--color-primary)",
                      color: "#ffffff",
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        {role !== MemberRole.barber && (
          <select
            value={filtroProf}
            onChange={(e) => onProfChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          >
            <option value="todos">Todos os barbeiros</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total de Comissões",
            value: fmt(totalGeral),
            color: "var(--color-gold)",
          },
          {
            label: "Faturamento Período",
            value: fmt(totalFaturamento),
            color: "var(--text-primary)",
          },
          {
            label: "% Médio sobre fat.",
            value:
              totalFaturamento > 0
                ? ((totalGeral / totalFaturamento) * 100).toFixed(1) + "%"
                : "—",
            color: "var(--text-primary)",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              {k.label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: k.color }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {isPending ? (
        <LoadingState />
      ) : resumoFiltrado.length === 0 ? (
        <EmptyState
          title="Nenhuma comissão no período"
          description="Feche comandas com profissionais que têm comissão ativa."
        />
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Profissional",
                  "Comandas",
                  "Faturamento",
                  "Com. Serviços",
                  "Com. Produtos",
                  "Total Comissão",
                ].map((h, i) => (
                  <TableHead
                    key={h}
                    style={
                      i === 0
                        ? { padding: "10px 24px" }
                        : { textAlign: "right" }
                    }
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumoFiltrado.map((r) => {
                const p = professionalsComPct.find(
                  (pc) => pc.id === r.professionalId,
                );
                const semComissao =
                  !p?.commissionOnServices && !p?.commissionOnProducts;
                return (
                <TableRow key={r.professionalId}>
                  <TableCell style={{ padding: "16px 24px", fontWeight: 500 }}>
                    <div className="flex items-center gap-2">
                      <span>{r.professionalName}</span>
                      {semComissao && (
                        <span
                          title="Configure o percentual de comissão para que os atendimentos deste profissional gerem comissão"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: "var(--status-yellow)",
                            color: "#000",
                          }}
                        >
                          <AlertTriangle size={11} />
                          Sem comissão configurada
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell align="right" muted style={{ padding: "16px" }}>
                    {r.totalComandas}
                  </TableCell>
                  <TableCell align="right" style={{ padding: "16px" }}>
                    {fmt(r.totalFaturamento)}
                  </TableCell>
                  <TableCell align="right" style={{ padding: "16px" }}>
                    {r.totalComissaoServicos > 0 ? (
                      <span style={{ color: "var(--status-green)" }}>
                        {fmt(r.totalComissaoServicos)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>—</span>
                    )}
                  </TableCell>
                  <TableCell align="right" style={{ padding: "16px" }}>
                    {r.totalComissaoProdutos > 0 ? (
                      <span style={{ color: "var(--status-green)" }}>
                        {fmt(r.totalComissaoProdutos)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>—</span>
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ padding: "16px 24px", fontWeight: 700 }}
                  >
                    {r.totalComissao > 0 ? (
                      <span style={{ color: "var(--color-gold)" }}>
                        {fmt(r.totalComissao)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>—</span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
            {resumoFiltrado.length > 1 && (
              <TableFooter>
                <TableRow
                  onMouseEnter={undefined}
                  onMouseLeave={undefined}
                  style={{
                    borderTop: "1px solid var(--border)",
                    borderBottom: "none",
                    backgroundColor: "var(--bg-card-elevated)",
                  }}
                >
                  <TableCell style={{ padding: "12px 24px", fontWeight: 700 }}>
                    Total
                  </TableCell>
                  <TableCell align="right" muted>
                    {resumoFiltrado.reduce((s, r) => s + r.totalComandas, 0)}
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700 }}>
                    {fmt(totalFaturamento)}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ color: "var(--status-green)", fontWeight: 700 }}
                  >
                    {fmt(
                      resumoFiltrado.reduce(
                        (s, r) => s + r.totalComissaoServicos,
                        0,
                      ),
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{ color: "var(--status-green)", fontWeight: 700 }}
                  >
                    {fmt(
                      resumoFiltrado.reduce(
                        (s, r) => s + r.totalComissaoProdutos,
                        0,
                      ),
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{
                      padding: "12px 24px",
                      color: "var(--color-gold)",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(totalGeral)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}

      {/* Configurar percentuais */}
      {role === MemberRole.owner && profissionaisComissionaveis.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Configuração de Comissões por Barbeiro
          </h2>
          <div className="space-y-3">
            {profissionaisComissionaveis.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {p.commissionOnServices
                      ? `Serviços: ${toNumber(p.commissionServicePct)}%`
                      : "Serviços: sem comissão"}
                    {" · "}
                    {p.commissionOnProducts
                      ? `Produtos: ${toNumber(p.commissionProductPct)}%`
                      : "Produtos: sem comissão"}
                  </p>
                </div>
                <button
                  onClick={() => abrirEdit(p)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    backgroundColor: "var(--bg-card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={!!editingProfessional}
        onClose={fecharEdit}
        title={`Comissão — ${editingProfessional?.name ?? ""}`}
        description="Configure o percentual de comissão para cada tipo de item."
        size="sm"
      >
        {editingProfessional && (
          <>
            <div className="mb-5">
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editOnServices}
                  onChange={(e) => setEditOnServices(e.target.checked)}
                  className="w-4 h-4 accent-[#C8102E]"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Comissão em Serviços
                </span>
              </label>
              {editOnServices && (
                <div className="ml-7">
                  <Input
                    label="Percentual (%)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editServicePct}
                    onChange={(e) => setEditServicePct(e.target.value)}
                    placeholder="ex: 40"
                    style={{ width: 128 }}
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editOnProducts}
                  onChange={(e) => setEditOnProducts(e.target.checked)}
                  className="w-4 h-4 accent-[#C8102E]"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Comissão em Produtos
                </span>
              </label>
              {editOnProducts && (
                <div className="ml-7">
                  <Input
                    label="Percentual (%)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editProductPct}
                    onChange={(e) => setEditProductPct(e.target.value)}
                    placeholder="ex: 10"
                    style={{ width: 128 }}
                  />
                </div>
              )}
            </div>

            {/* Seção expansível: overrides por item */}
            <div
              className="mb-5 rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: itemCommExpanded ? "var(--color-primary-10)" : "var(--bg-base)",
                  color: itemCommExpanded ? "var(--color-primary)" : "var(--text-secondary)",
                }}
                onClick={() => {
                  const next = !itemCommExpanded;
                  setItemCommExpanded(next);
                  if (next && !itemCommData && editingProfessional) {
                    loadItemCommissions(editingProfessional.id);
                  }
                }}
              >
                <span>Comissões específicas por item</span>
                <span
                  style={{
                    display: "inline-block",
                    transition: "transform 200ms",
                    transform: itemCommExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  ▾
                </span>
              </button>

              {itemCommExpanded && (
                <div
                  className="px-4 py-3 space-y-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {loadingItemComm ? (
                    <p className="text-sm text-center py-2" style={{ color: "var(--text-tertiary)" }}>
                      Carregando…
                    </p>
                  ) : itemCommData ? (
                    <>
                      {itemCommData.services.length > 0 && (
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-wide mb-2"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Serviços
                          </p>
                          <div className="space-y-2">
                            {itemCommData.services.map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-3">
                                <span className="text-sm flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                                  {s.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder="padrão"
                                    value={itemCommEdits[`svc:${s.id}`] ?? ""}
                                    onChange={(e) =>
                                      setItemCommEdits((prev) => ({
                                        ...prev,
                                        [`svc:${s.id}`]: e.target.value,
                                      }))
                                    }
                                    className="livo-input text-right text-sm"
                                    style={{ width: 80 }}
                                  />
                                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {itemCommData.products.length > 0 && (
                        <div>
                          <p
                            className="text-xs font-semibold uppercase tracking-wide mb-2"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Produtos
                          </p>
                          <div className="space-y-2">
                            {itemCommData.products.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-3">
                                <span className="text-sm flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                                  {p.name}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder="padrão"
                                    value={itemCommEdits[`prd:${p.id}`] ?? ""}
                                    onChange={(e) =>
                                      setItemCommEdits((prev) => ({
                                        ...prev,
                                        [`prd:${p.id}`]: e.target.value,
                                      }))
                                    }
                                    className="livo-input text-right text-sm"
                                    style={{ width: 80 }}
                                  />
                                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Deixe em branco para usar a comissão padrão configurada acima.
                      </p>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {saveError && (
              <div
                className="rounded-lg px-4 py-3 text-sm mb-4"
                style={{
                  backgroundColor: "rgba(200,16,46,0.1)",
                  border: "1px solid rgba(200,16,46,0.3)",
                  color: "var(--status-red)",
                }}
              >
                <AlertTriangle size={14} className="inline mr-1" />{saveError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={fecharEdit}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: "var(--bg-card-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarPct}
                disabled={saving}
                className="px-4 py-2 text-white text-sm rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
