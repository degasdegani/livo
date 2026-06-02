"use client";

import { MemberRole } from "@prisma/client";
import { useState, useTransition } from "react";
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

  const membershipsComProf = memberships.filter((m) => m.professional !== null);

  // Suprimir warning de dataInicio/dataFim não usados no JSX
  void dataInicio;
  void dataFim;

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Comissões</h1>
          <p className="text-sm text-[#9A9AA6] mt-1">
            {role === MemberRole.barber
              ? "Suas comissões por período"
              : "Comissões por profissional"}
          </p>
        </div>

        {role === MemberRole.owner && membershipsComProf.length > 0 && (
          <button
            onClick={() => abrirEdit(membershipsComProf[0])}
            className="px-4 py-2 bg-[#17171C] border border-[#2A2A33] rounded-lg text-sm text-white hover:border-[#C8102E] transition-colors"
          >
            ⚙️ Configurar percentuais
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-[#17171C] border border-[#2A2A33] rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodoChange(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodo === p.value
                  ? "bg-[#C8102E] text-white"
                  : "text-[#9A9AA6] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {role !== MemberRole.barber && (
          <select
            value={filtroProf}
            onChange={(e) => onProfChange(e.target.value)}
            className="px-3 py-2 bg-[#17171C] border border-[#2A2A33] rounded-lg text-sm text-white"
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
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-4">
          <p className="text-xs text-[#9A9AA6] uppercase tracking-wider">
            Total de Comissões
          </p>
          <p className="text-2xl font-bold text-[#C8A24C] mt-1">
            {fmt(totalGeral)}
          </p>
        </div>
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-4">
          <p className="text-xs text-[#9A9AA6] uppercase tracking-wider">
            Faturamento Período
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {fmt(totalFaturamento)}
          </p>
        </div>
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-4">
          <p className="text-xs text-[#9A9AA6] uppercase tracking-wider">
            % Médio sobre fat.
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {totalFaturamento > 0
              ? ((totalGeral / totalFaturamento) * 100).toFixed(1) + "%"
              : "—"}
          </p>
        </div>
      </div>

      {/* Tabela */}
      {isPending ? (
        <div className="flex items-center justify-center py-12 text-[#9A9AA6]">
          Carregando...
        </div>
      ) : resumoFiltrado.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#9A9AA6]">
          <p className="text-lg">Nenhuma comissão no período</p>
          <p className="text-sm mt-1">
            Feche comandas com profissionais que têm comissão ativa.
          </p>
        </div>
      ) : (
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A33]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[#9A9AA6] uppercase tracking-wider">
                  Profissional
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9A9AA6] uppercase tracking-wider">
                  Comandas
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9A9AA6] uppercase tracking-wider">
                  Faturamento
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9A9AA6] uppercase tracking-wider">
                  Com. Serviços
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9A9AA6] uppercase tracking-wider">
                  Com. Produtos
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-[#9A9AA6] uppercase tracking-wider">
                  Total Comissão
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A33]">
              {resumoFiltrado.map((r) => (
                <tr
                  key={r.professionalId}
                  className="hover:bg-[#1F1F27] transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {r.professionalName}
                  </td>
                  <td className="px-4 py-4 text-sm text-[#9A9AA6] text-right">
                    {r.totalComandas}
                  </td>
                  <td className="px-4 py-4 text-sm text-white text-right">
                    {fmt(r.totalFaturamento)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right">
                    {r.totalComissaoServicos > 0 ? (
                      <span className="text-[#3FB950]">
                        {fmt(r.totalComissaoServicos)}
                      </span>
                    ) : (
                      <span className="text-[#6E6E78]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-right">
                    {r.totalComissaoProdutos > 0 ? (
                      <span className="text-[#3FB950]">
                        {fmt(r.totalComissaoProdutos)}
                      </span>
                    ) : (
                      <span className="text-[#6E6E78]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right">
                    {r.totalComissao > 0 ? (
                      <span className="text-[#C8A24C]">
                        {fmt(r.totalComissao)}
                      </span>
                    ) : (
                      <span className="text-[#6E6E78]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {resumoFiltrado.length > 1 && (
              <tfoot>
                <tr className="border-t border-[#2A2A33] bg-[#1F1F27]">
                  <td className="px-6 py-3 text-sm font-bold text-white">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm text-[#9A9AA6] text-right">
                    {resumoFiltrado.reduce((s, r) => s + r.totalComandas, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white text-right">
                    {fmt(totalFaturamento)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-[#3FB950] text-right">
                    {fmt(
                      resumoFiltrado.reduce(
                        (s, r) => s + r.totalComissaoServicos,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-[#3FB950] text-right">
                    {fmt(
                      resumoFiltrado.reduce(
                        (s, r) => s + r.totalComissaoProdutos,
                        0,
                      ),
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-[#C8A24C] text-right">
                    {fmt(totalGeral)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Configurar percentuais */}
      {role === MemberRole.owner && membershipsComProf.length > 0 && (
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">
            Configuração de Comissões por Barbeiro
          </h2>
          <div className="space-y-3">
            {membershipsComProf.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-3 border-b border-[#2A2A33] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {m.professional?.name}
                  </p>
                  <p className="text-xs text-[#9A9AA6] mt-0.5">
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
                  className="px-3 py-1.5 bg-[#1F1F27] border border-[#2A2A33] rounded-lg text-xs text-[#9A9AA6] hover:text-white hover:border-[#C8102E] transition-colors"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {editingMembership && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#17171C] border border-[#2A2A33] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-1">
              Comissão — {editingMembership.professional?.name}
            </h3>
            <p className="text-sm text-[#9A9AA6] mb-6">
              Configure o percentual de comissão para cada tipo de item.
            </p>

            <div className="mb-5">
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editOnServices}
                  onChange={(e) => setEditOnServices(e.target.checked)}
                  className="w-4 h-4 accent-[#C8102E]"
                />
                <span className="text-sm font-medium text-white">
                  Comissão em Serviços
                </span>
              </label>
              {editOnServices && (
                <div className="ml-7">
                  <label className="block text-xs text-[#9A9AA6] mb-1">
                    Percentual (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editServicePct}
                    onChange={(e) => setEditServicePct(e.target.value)}
                    className="w-32 px-3 py-2 bg-[#0B0B0D] border border-[#2A2A33] rounded-lg text-sm text-white focus:border-[#C8102E] outline-none"
                    placeholder="ex: 40"
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
                <span className="text-sm font-medium text-white">
                  Comissão em Produtos
                </span>
              </label>
              {editOnProducts && (
                <div className="ml-7">
                  <label className="block text-xs text-[#9A9AA6] mb-1">
                    Percentual (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editProductPct}
                    onChange={(e) => setEditProductPct(e.target.value)}
                    className="w-32 px-3 py-2 bg-[#0B0B0D] border border-[#2A2A33] rounded-lg text-sm text-white focus:border-[#C8102E] outline-none"
                    placeholder="ex: 10"
                  />
                </div>
              )}
            </div>

            {saveError && (
              <p className="text-sm text-[#C8102E] mb-4">{saveError}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={fecharEdit}
                className="px-4 py-2 bg-[#1F1F27] border border-[#2A2A33] rounded-lg text-sm text-white hover:border-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPct}
                disabled={saving}
                className="px-4 py-2 bg-[#C8102E] hover:bg-[#E0263D] text-white text-sm rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
