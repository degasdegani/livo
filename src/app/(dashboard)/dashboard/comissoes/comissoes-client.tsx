// src/app/(dashboard)/dashboard/comissoes/comissoes-client.tsx
"use client";

import { MemberRole } from "@prisma/client";
import { AlertTriangle, Settings } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
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
import { updateMembershipComissao } from "../settings/actions";

type Profissional = { id: string; name: string };
type MembershipPct = {
  id: string;
  role: MemberRole;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
  commissionServicePct: unknown;
  commissionProductPct: unknown;
  professional: { id: string; name: string } | null;
};
type Props = {
  resumoInicial: ResumoProf[];
  profissionais: Profissional[];
  memberships: MembershipPct[];
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
  memberships,
  dataInicio,
  dataFim,
  role,
  myProfessionalId,
}: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
  const [filtroProf, setFiltroProf] = useState<string>("todos");
  const [resumo, setResumo] = useState<ResumoProf[]>(resumoInicial);
  const [isPending, startTransition] = useTransition();
  const [editingMembership, setEditingMembership] =
    useState<MembershipPct | null>(null);
  const [editServicePct, setEditServicePct] = useState("");
  const [editProductPct, setEditProductPct] = useState("");
  const [editOnServices, setEditOnServices] = useState(false);
  const [editOnProducts, setEditOnProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  void dataInicio;
  void dataFim;

  function abrirEdit(m: MembershipPct) {
    setEditingMembership(m);
    setEditOnServices(m.commissionOnServices);
    setEditOnProducts(m.commissionOnProducts);
    setEditServicePct(toNumber(m.commissionServicePct).toString() || "");
    setEditProductPct(toNumber(m.commissionProductPct).toString() || "");
    setSaveError("");
  }
  function fecharEdit() {
    setEditingMembership(null);
    setSaveError("");
  }

  async function salvarPct() {
    if (!editingMembership) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateMembershipComissao({
        membershipId: editingMembership.id,
        commissionOnServices: editOnServices,
        commissionOnProducts: editOnProducts,
        commissionServicePct: editOnServices
          ? parseFloat(editServicePct) || null
          : null,
        commissionProductPct: editOnProducts
          ? parseFloat(editProductPct) || null
          : null,
      });
      fecharEdit();
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
  // Owner nunca aparece na lista de comissões — mesmo que tenha professional vinculado
  const membershipsComProf = memberships.filter(
    (m) => m.professional !== null && m.role !== MemberRole.owner,
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
        {role === MemberRole.owner && membershipsComProf.length > 0 && (
          <button
            onClick={() => abrirEdit(membershipsComProf[0])}
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
              {resumoFiltrado.map((r) => (
                <TableRow key={r.professionalId}>
                  <TableCell style={{ padding: "16px 24px", fontWeight: 500 }}>
                    {r.professionalName}
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
              ))}
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
      {role === MemberRole.owner && membershipsComProf.length > 0 && (
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
            {membershipsComProf.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {m.professional?.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {m.commissionOnServices
                      ? `Serviços: ${toNumber(m.commissionServicePct)}%`
                      : "Serviços: sem comissão"}
                    {" · "}
                    {m.commissionOnProducts
                      ? `Produtos: ${toNumber(m.commissionProductPct)}%`
                      : "Produtos: sem comissão"}
                  </p>
                </div>
                <button
                  onClick={() => abrirEdit(m)}
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
        open={!!editingMembership}
        onClose={fecharEdit}
        title={`Comissão — ${editingMembership?.professional?.name ?? ""}`}
        description="Configure o percentual de comissão para cada tipo de item."
        size="sm"
      >
        {editingMembership && (
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
