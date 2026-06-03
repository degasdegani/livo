// src/app/(dashboard)/dashboard/relatorios/relatorios-client.tsx
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

  const linhas = [0.25, 0.5, 0.75, 1].map((frac) => ({
    y: paddingTop + areaAltura * (1 - frac),
    valor: Math.round(maxValor * frac),
  }));

  // Cores via currentColor não funcionam bem em SVG inline — usamos
  // variáveis CSS como string literal pois SVG aceita var() em fill/stroke
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
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 6}
              y={l.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="var(--text-tertiary)"
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
              <rect
                x={x}
                y={y}
                width={larguraBarra}
                height={altBarra}
                rx="2"
                fill={
                  d.totalInCents > 0 ? "var(--color-primary)" : "var(--border)"
                }
                opacity={d.totalInCents > 0 ? 1 : 0.4}
              />
              {mostrar.length <= 20 && (
                <text
                  x={x + larguraBarra / 2}
                  y={altura - 6}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--text-tertiary)"
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
          stroke="var(--border)"
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
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={
              periodo === p.value
                ? {
                    backgroundColor: "var(--color-primary)",
                    color: "#ffffff",
                  }
                : {
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            {p.label}
          </button>
        ))}
        {isPending && (
          <span
            className="text-xs self-center ml-2 animate-pulse"
            style={{ color: "var(--text-tertiary)" }}
          >
            Carregando...
          </span>
        )}
      </div>

      {/* ── Título do período ── */}
      <div>
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {periodoLabel}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          Relatório baseado em comandas fechadas
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Faturamento"
          valor={fmt(kpis.faturamentoTotal)}
          sub="comandas fechadas"
          cor="var(--status-green)"
        />
        <KpiCard
          titulo="Comandas"
          valor={String(kpis.totalComandas)}
          sub="atendimentos"
          cor="var(--color-gold)"
        />
        <KpiCard
          titulo="Ticket Médio"
          valor={fmt(kpis.ticketMedio)}
          sub="por comanda"
          cor="var(--color-primary)"
        />
        <KpiCard
          titulo="Clientes"
          valor={String(kpis.clientesUnicos)}
          sub="nomes únicos"
          cor="var(--text-secondary)"
        />
      </div>

      {/* ── Gráfico de evolução ── */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Evolução de faturamento
        </h3>
        {evolucao.every((e) => e.totalInCents === 0) ? (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            Nenhuma comanda fechada neste período
          </p>
        ) : (
          <GraficoBarras dados={evolucao} />
        )}
      </div>

      {/* ── Grid: Serviços + Métodos de pagamento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Métodos de pagamento
          </h3>
          {pagamentos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Nenhum registro
            </p>
          ) : (
            <div className="space-y-3">
              {pagamentos.map((p, i) => {
                const pct =
                  kpis.faturamentoTotal > 0
                    ? Math.round((p.total / kpis.faturamentoTotal) * 100)
                    : 0;
                // Cores sequenciais para as barras de progresso
                const barCores = [
                  "var(--color-primary)",
                  "var(--color-gold)",
                  "var(--status-green)",
                ];
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: "var(--text-primary)" }}>
                        {p.metodo}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {fmt(p.total)}{" "}
                        <span style={{ color: "var(--text-tertiary)" }}>
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--border)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: barCores[i % barCores.length],
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
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        {titulo}
      </p>
      <p className="text-2xl font-bold" style={{ color: cor }}>
        {valor}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
        {sub}
      </p>
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
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        className="text-sm font-semibold uppercase tracking-wider mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        {titulo}
      </h3>
      {linhas.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {vazio || "Nenhum registro"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {colunas.map((col, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-medium pb-3 pr-4"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  {linha.map((cel, j) => (
                    <td
                      key={j}
                      className="py-2.5 pr-4"
                      style={{
                        color:
                          j === 0
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
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
