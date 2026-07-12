// src/app/(dashboard)/dashboard/relatorios/relatorios-client.tsx
"use client";

import { Award, FileSpreadsheet, FileText } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  getRelatorioData,
  PeriodoFiltro,
  exportRelatorio,
  type TipoRelatorioExport,
} from "./actions";

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

// ── Exportação de relatórios (Excel/CSV) — só owner ───────────────────────────

type TipoOption = { value: TipoRelatorioExport; label: string; temPeriodo: boolean };

const TIPOS_RELATORIO: TipoOption[] = [
  { value: "faturamento", label: "Faturamento", temPeriodo: true },
  { value: "comissoes", label: "Comissões", temPeriodo: true },
  { value: "comandas", label: "Comandas", temPeriodo: true },
  { value: "clientes", label: "Clientes", temPeriodo: false },
  { value: "assinaturas", label: "Assinaturas", temPeriodo: false },
  { value: "pacotes", label: "Pacotes", temPeriodo: false },
];

type PeriodoPreset = "semana" | "mes" | "ano" | "custom";

function calcularPeriodoExport(
  preset: PeriodoPreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | undefined {
  const agora = new Date();

  if (preset === "custom") {
    if (!customFrom || !customTo) return undefined;
    return { from: `${customFrom}T00:00:00`, to: `${customTo}T23:59:59` };
  }

  if (preset === "semana") {
    const diaSemana = agora.getDay();
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - diaSemana);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return { from: inicio.toISOString(), to: fim.toISOString() };
  }

  if (preset === "mes") {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { from: inicio.toISOString(), to: fim.toISOString() };
  }

  // ano
  const inicio = new Date(agora.getFullYear(), 0, 1);
  const fim = new Date(agora.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { from: inicio.toISOString(), to: fim.toISOString() };
}

function downloadBase64File(filename: string, mimeType: string, base64: string) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportSection() {
  const [tipo, setTipo] = useState<TipoRelatorioExport>("faturamento");
  const [preset, setPreset] = useState<PeriodoPreset>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isExporting, startExport] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const tipoAtual = TIPOS_RELATORIO.find((t) => t.value === tipo)!;

  function exportar(formato: "excel" | "csv") {
    setErro(null);

    if (tipoAtual.temPeriodo && preset === "custom" && (!customFrom || !customTo)) {
      setErro("Selecione as datas de início e fim.");
      return;
    }

    startExport(async () => {
      try {
        const periodo = tipoAtual.temPeriodo
          ? calcularPeriodoExport(preset, customFrom, customTo)
          : undefined;
        const resultado = await exportRelatorio({ tipo, formato, periodo });
        downloadBase64File(resultado.filename, resultado.mimeType, resultado.base64);
      } catch {
        setErro("Não foi possível gerar o arquivo. Tente novamente.");
      }
    });
  }

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
        Exportar relatório
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Select
          label="Tipo de relatório"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoRelatorioExport)}
        >
          {TIPOS_RELATORIO.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        {tipoAtual.temPeriodo && (
          <Select
            label="Período"
            value={preset}
            onChange={(e) => setPreset(e.target.value as PeriodoPreset)}
          >
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
            <option value="ano">Este ano</option>
            <option value="custom">Personalizado</option>
          </Select>
        )}
      </div>

      {tipoAtual.temPeriodo && preset === "custom" && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p
              className="text-xs uppercase tracking-wide mb-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              De
            </p>
            <DatePicker value={customFrom} onChange={setCustomFrom} />
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wide mb-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Até
            </p>
            <DatePicker value={customTo} onChange={setCustomTo} />
          </div>
        </div>
      )}

      {erro && (
        <p className="text-sm mb-3" style={{ color: "var(--status-red)" }}>
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isExporting}
          onClick={() => exportar("excel")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <FileSpreadsheet size={16} />
          {isExporting ? "Gerando..." : "Exportar Excel"}
        </button>
        <button
          type="button"
          disabled={isExporting}
          onClick={() => exportar("csv")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <FileText size={16} />
          {isExporting ? "Gerando..." : "Exportar CSV"}
        </button>
      </div>
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
    pacotes,
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

      {/* ── Pacotes (seção separada — NÃO somada ao faturamento de comandas) ── */}
      <div>
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Pacotes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            titulo="A receber"
            valor={fmt(pacotes.aReceberInCents)}
            sub={`${pacotes.aReceberCount} ${
              pacotes.aReceberCount === 1
                ? "pacote pendente"
                : "pacotes pendentes"
            }`}
            cor="var(--color-gold)"
          />
          <KpiCard
            titulo="Recebido no período"
            valor={fmt(pacotes.receitaPeriodoInCents)}
            sub={`${pacotes.receitaPeriodoCount} ${
              pacotes.receitaPeriodoCount === 1
                ? "pacote pago"
                : "pacotes pagos"
            }`}
            cor="var(--status-green)"
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
          Receita reconhecida na data do pagamento. &quot;A receber&quot; é o
          total pendente atual (independe do período); &quot;Recebido no
          período&quot; segue o filtro acima. Não incluído no faturamento de
          comandas.
        </p>
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
            <span className="inline-flex items-center gap-1.5">
              {i === 0 && <Award size={14} className="text-yellow-500" />}
              {i === 1 && <Award size={14} className="text-gray-400" />}
              {i === 2 && <Award size={14} className="text-amber-700" />}
              {b.nome}
            </span>,
            String(b.comandas),
            fmt(b.faturamento),
            fmt(b.comissoes),
          ])}
          vazio=""
        />
      )}

      {/* ── Exportação — dado agregado sensível, só owner ── */}
      {role === "owner" && <ExportSection />}
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
  linhas: (string | ReactNode)[][];
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
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((col, i) => (
                <TableHead
                  key={i}
                  style={{ padding: "0 16px 12px 0" }}
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha, i) => (
              <TableRow key={i}>
                {linha.map((cel, j) => (
                  <TableCell
                    key={j}
                    muted={j !== 0}
                    style={{ padding: "10px 16px 10px 0" }}
                  >
                    {cel}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
