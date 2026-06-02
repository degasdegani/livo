"use client";

import { useState, useTransition } from "react";
import { getRelatorioData, PeriodoFiltro } from "./actions";

type RelatorioData = Awaited<ReturnType<typeof getRelatorioData>>;

const PERIODOS: { value: PeriodoFiltro; label: string }[] = [
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "ano", label: "Este ano" },
];

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ── Gráfico de barras SVG puro ────────────────────────────────────────────────
function GraficoBarras({
  dados,
}: {
  dados: { label: string; totalInCents: number }[];
}) {
  if (dados.length === 0) return null;

  const maxValor = Math.max(...dados.map((d) => d.totalInCents), 1);
  const largura = 700;
  const altura = 200;
  const paddingLeft = 60;
  const paddingBottom = 40;
  const paddingTop = 16;
  const areaLargura = largura - paddingLeft - 16;
  const areaAltura = altura - paddingBottom - paddingTop;

  // Mostra no máximo 31 barras, comprimindo labels se necessário
  const mostrar =
    dados.length > 20
      ? dados.filter(
          (_, i) =>
            i % Math.ceil(dados.length / 20) === 0 || i === dados.length - 1,
        )
      : dados;
  const larguraBarra = Math.max(
    4,
    Math.floor(areaLargura / mostrar.length) - 3,
  );

  // Linhas guia: 4 linhas horizontais
  const linhas = [0.25, 0.5, 0.75, 1].map((frac) => ({
    y: paddingTop + areaAltura * (1 - frac),
    valor: Math.round(maxValor * frac),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        style={{ minWidth: "320px", maxHeight: "220px" }}
      >
        {/* Linhas guia */}
        {linhas.map((l, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={l.y}
              x2={largura - 16}
              y2={l.y}
              stroke="#2A2A33"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 6}
              y={l.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#6E6E78"
            >
              {l.valor >= 100 ? `R$${Math.round(l.valor / 100)}` : "0"}
            </text>
          </g>
        ))}

        {/* Barras */}
        {mostrar.map((d, i) => {
          const altBarra =
            d.totalInCents > 0
              ? Math.max(2, (d.totalInCents / maxValor) * areaAltura)
              : 0;
          const x = paddingLeft + i * (larguraBarra + 3);
          const y = paddingTop + areaAltura - altBarra;

          return (
            <g key={i}>
              {/* Barra com gradiente vermelho */}
              <rect
                x={x}
                y={y}
                width={larguraBarra}
                height={altBarra}
                rx="2"
                fill={d.totalInCents > 0 ? "#C8102E" : "#2A2A33"}
                opacity={d.totalInCents > 0 ? 1 : 0.4}
              />
              {/* Label do eixo X — só se couber */}
              {mostrar.length <= 20 && (
                <text
                  x={x + larguraBarra / 2}
                  y={altura - 6}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6E6E78"
                  transform={
                    mostrar.length > 12
                      ? `rotate(-45, ${x + larguraBarra / 2}, ${altura - 6})`
                      : undefined
                  }
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Eixo Y */}
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + areaAltura}
          stroke="#2A2A33"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function RelatoriosClient({
  dadosIniciais,
}: {
  dadosIniciais: RelatorioData;
}) {
  const [dados, setDados] = useState<RelatorioData>(dadosIniciais);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [isPending, startTransition] = useTransition();

  function trocarPeriodo(novoPeriodo: PeriodoFiltro) {
    setPeriodo(novoPeriodo);
    startTransition(async () => {
      const novos = await getRelatorioData(novoPeriodo);
      setDados(novos);
    });
  }

  const {
    kpis,
    pagamentos,
    topServicos,
    topProdutos,
    rankingBarbeiros,
    evolucao,
    periodoLabel,
    role,
  } = dados;

  return (
    <div className="space-y-8">
      {/* ── Filtro de período ── */}
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => trocarPeriodo(p.value)}
            disabled={isPending}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              periodo === p.value
                ? "bg-[#C8102E] text-white"
                : "bg-[#17171C] text-[#9A9AA6] border border-[#2A2A33] hover:border-[#C8102E] hover:text-white"
            } disabled:opacity-50`}
          >
            {p.label}
          </button>
        ))}
        {isPending && (
          <span className="text-xs text-[#6E6E78] self-center ml-2 animate-pulse">
            Carregando...
          </span>
        )}
      </div>

      {/* ── Título do período ── */}
      <div>
        <h2 className="text-xl font-semibold text-white">{periodoLabel}</h2>
        <p className="text-sm text-[#6E6E78] mt-0.5">
          Relatório baseado em comandas fechadas
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Faturamento"
          valor={fmt(kpis.faturamentoTotal)}
          sub="comandas fechadas"
          cor="#3FB950"
        />
        <KpiCard
          titulo="Comandas"
          valor={String(kpis.totalComandas)}
          sub="atendimentos"
          cor="#C8A24C"
        />
        <KpiCard
          titulo="Ticket Médio"
          valor={fmt(kpis.ticketMedio)}
          sub="por comanda"
          cor="#C8102E"
        />
        <KpiCard
          titulo="Clientes"
          valor={String(kpis.clientesUnicos)}
          sub="nomes únicos"
          cor="#9A9AA6"
        />
      </div>

      {/* ── Gráfico de evolução ── */}
      <div
        style={{
          background: "#17171C",
          border: "1px solid #2A2A33",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h3 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-wider mb-4">
          Evolução de faturamento
        </h3>
        {evolucao.every((e) => e.totalInCents === 0) ? (
          <p className="text-sm text-[#6E6E78] text-center py-8">
            Nenhuma comanda fechada neste período
          </p>
        ) : (
          <GraficoBarras dados={evolucao} />
        )}
      </div>

      {/* ── Grid: Serviços + Métodos de pagamento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top serviços */}
        <TabelaSimples
          titulo="Serviços mais realizados"
          colunas={["Serviço", "Qtd", "Total"]}
          linhas={topServicos.map((s) => [
            s.nome,
            String(s.quantidade),
            fmt(s.totalInCents),
          ])}
          vazio="Nenhum serviço realizado neste período"
        />

        {/* Métodos de pagamento */}
        <div
          style={{
            background: "#17171C",
            border: "1px solid #2A2A33",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h3 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-wider mb-4">
            Métodos de pagamento
          </h3>
          {pagamentos.length === 0 ? (
            <p className="text-sm text-[#6E6E78]">Nenhum registro</p>
          ) : (
            <div className="space-y-3">
              {pagamentos.map((p, i) => {
                const pct =
                  kpis.faturamentoTotal > 0
                    ? Math.round((p.total / kpis.faturamentoTotal) * 100)
                    : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{p.metodo}</span>
                      <span className="text-[#9A9AA6]">
                        {fmt(p.total)}{" "}
                        <span className="text-[#6E6E78]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2A2A33] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background:
                            i === 0
                              ? "#C8102E"
                              : i === 1
                                ? "#C8A24C"
                                : "#3FB950",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Produtos mais vendidos ── */}
      {topProdutos.length > 0 && (
        <TabelaSimples
          titulo="Produtos mais vendidos"
          colunas={["Produto", "Qtd", "Total"]}
          linhas={topProdutos.map((p) => [
            p.nome,
            String(p.quantidade),
            fmt(p.totalInCents),
          ])}
          vazio=""
        />
      )}

      {/* ── Ranking de barbeiros (só owner) ── */}
      {role === "owner" && rankingBarbeiros.length > 0 && (
        <TabelaSimples
          titulo="Ranking de barbeiros"
          colunas={["Barbeiro", "Comandas", "Faturamento", "Comissões"]}
          linhas={rankingBarbeiros.map((b, i) => [
            `${i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}${b.nome}`,
            String(b.comandas),
            fmt(b.faturamento),
            fmt(b.comissoes),
          ])}
          vazio=""
        />
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function KpiCard({
  titulo,
  valor,
  sub,
  cor,
}: {
  titulo: string;
  valor: string;
  sub: string;
  cor: string;
}) {
  return (
    <div
      style={{
        background: "#17171C",
        border: "1px solid #2A2A33",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <p className="text-xs font-semibold text-[#6E6E78] uppercase tracking-wider mb-2">
        {titulo}
      </p>
      <p className="text-2xl font-bold" style={{ color: cor }}>
        {valor}
      </p>
      <p className="text-xs text-[#6E6E78] mt-1">{sub}</p>
    </div>
  );
}

function TabelaSimples({
  titulo,
  colunas,
  linhas,
  vazio,
}: {
  titulo: string;
  colunas: string[];
  linhas: string[][];
  vazio: string;
}) {
  return (
    <div
      style={{
        background: "#17171C",
        border: "1px solid #2A2A33",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-wider mb-4">
        {titulo}
      </h3>
      {linhas.length === 0 ? (
        <p className="text-sm text-[#6E6E78]">{vazio || "Nenhum registro"}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {colunas.map((col, i) => (
                  <th
                    key={i}
                    className="text-left text-xs text-[#6E6E78] font-medium pb-3 pr-4"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: "1px solid #2A2A33",
                  }}
                >
                  {linha.map((cel, j) => (
                    <td
                      key={j}
                      className="py-2.5 pr-4 text-white"
                      style={{ color: j === 0 ? "#FFFFFF" : "#9A9AA6" }}
                    >
                      {cel}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
