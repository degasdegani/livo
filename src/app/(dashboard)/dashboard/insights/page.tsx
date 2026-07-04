import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasModuleAccess } from "@/lib/modules";
import { requireRole } from "@/lib/permissions";
import type {
  Recommendation,
  RecommendationImpact,
  RecommendationSeverity,
  RecommendationSummary,
  RecommendationType,
} from "../analytics/recommendation-engine";
import { getRecommendations } from "../analytics/recommendation-engine";
import { dismissInsight } from "./actions";

// ─── Config maps (sem lógica de negócio — apenas apresentação) ────────────────

const TYPE_CONFIG: Record<
  RecommendationType,
  { label: string; color: string; bg: string }
> = {
  VIP_RISK: {
    label: "Cliente VIP",
    color: "var(--color-gold)",
    bg: "rgba(212,175,55,0.12)",
  },
  REACTIVATION: {
    label: "Reativação",
    color: "var(--color-primary)",
    bg: "var(--color-primary-10)",
  },
  REVENUE_OPTIMIZATION: {
    label: "Horário Ocioso",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.1)",
  },
  CAPACITY_OPTIMIZATION: {
    label: "Capacidade",
    color: "var(--text-tertiary)",
    bg: "var(--bg-card-elevated)",
  },
};

const SEVERITY_CONFIG: Record<
  RecommendationSeverity,
  { label: string; color: string; bg: string }
> = {
  high: {
    label: "ALTA",
    color: "rgba(239,68,68,1)",
    bg: "rgba(239,68,68,0.12)",
  },
  medium: {
    label: "MÉDIA",
    color: "var(--status-yellow)",
    bg: "rgba(251,191,36,0.12)",
  },
  low: {
    label: "BAIXA",
    color: "var(--text-tertiary)",
    bg: "var(--bg-card-elevated)",
  },
};

const IMPACT_CONFIG: Record<
  RecommendationImpact,
  { label: string; color: string; bg: string }
> = {
  alto: {
    label: "↑ Alto",
    color: "var(--status-green)",
    bg: "rgba(0,212,160,0.1)",
  },
  médio: {
    label: "↑ Médio",
    color: "var(--status-yellow)",
    bg: "rgba(251,191,36,0.1)",
  },
  baixo: {
    label: "— Baixo",
    color: "var(--text-tertiary)",
    bg: "var(--bg-card-elevated)",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function brl(cents: number): string {
  return `R$${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function getActionLink(
  rec: Recommendation,
): { href: string; label: string } | null {
  switch (rec.type) {
    case "VIP_RISK":
    case "REACTIVATION":
      return rec.metadata.clientId
        ? {
            href: `/dashboard/clients/${rec.metadata.clientId}`,
            label: "Ver cliente →",
          }
        : null;
    case "REVENUE_OPTIMIZATION":
      return { href: "/dashboard/agenda", label: "Ver agenda →" };
    case "CAPACITY_OPTIMIZATION":
      return { href: "/dashboard/profissionais", label: "Ver profissional →" };
  }
}

// ─── Componentes de render (Server Components inline) ─────────────────────────

function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: bg, letterSpacing: "0.5px" }}
    >
      {label}
    </span>
  );
}

function MetadataLine({ rec }: { rec: Recommendation }) {
  const parts: string[] = [];

  if (rec.metadata.diasInativo && rec.metadata.diasInativo < 999) {
    parts.push(`${rec.metadata.diasInativo} dias sem visita`);
  }
  if (rec.metadata.ticketMedio && rec.metadata.ticketMedio > 0) {
    parts.push(`ticket ${brl(rec.metadata.ticketMedio)}`);
  }
  if (rec.metadata.hora !== undefined) {
    parts.push(`${rec.metadata.hora.toString().padStart(2, "0")}:00`);
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
      {parts.join(" · ")}
    </p>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const typeConf = TYPE_CONFIG[rec.type];
  const sevConf = SEVERITY_CONFIG[rec.severity];
  const impConf = IMPACT_CONFIG[rec.estimatedImpact];
  const actionLink = getActionLink(rec);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${typeConf.color}`,
      }}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge label={typeConf.label} color={typeConf.color} bg={typeConf.bg} />
        <Badge label={sevConf.label} color={sevConf.color} bg={sevConf.bg} />
        <Badge label={impConf.label} color={impConf.color} bg={impConf.bg} />
      </div>
      <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>
        {rec.reason}
      </p>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        → {rec.suggestedAction}
      </p>
      <MetadataLine rec={rec} />
      <div
        className="mt-4 pt-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {actionLink ? (
          <a
            href={actionLink.href}
            className="text-xs font-semibold hover:underline"
            style={{ color: typeConf.color }}
          >
            {actionLink.label}
          </a>
        ) : (
          <span />
        )}
        <form action={dismissInsight}>
          <input type="hidden" name="recId" value={rec.id} />
          <button
            type="submit"
            className="text-xs hover:underline"
            style={{
              color: "var(--text-tertiary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Dispensar
          </button>
        </form>
      </div>
    </div>
  );
}

function RecommendationSection({
  title,
  recommendations,
}: {
  title: string;
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2
        className="text-xs font-bold tracking-widest uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title} ({recommendations.length})
      </h2>
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </section>
  );
}

function SummaryHeader({ summary }: { summary: RecommendationSummary }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <h1
        className="font-black mb-1"
        style={{
          fontSize: "22px",
          letterSpacing: "-0.3px",
          color: "var(--text-primary)",
        }}
      >
        Insights da Barbearia
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
        {summary.total === 0
          ? "Nenhuma sugestão no momento."
          : `${summary.total} ${summary.total === 1 ? "sugestão" : "sugestões"} para aumentar o faturamento`}
      </p>
      {summary.total > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.high > 0 && (
            <Badge
              label={`● ALTA: ${summary.high}`}
              color="rgba(239,68,68,1)"
              bg="rgba(239,68,68,0.12)"
            />
          )}
          {summary.medium > 0 && (
            <Badge
              label={`● MÉDIA: ${summary.medium}`}
              color="var(--status-yellow)"
              bg="rgba(251,191,36,0.12)"
            />
          )}
          {summary.low > 0 && (
            <Badge
              label={`● BAIXA: ${summary.low}`}
              color="var(--text-tertiary)"
              bg="var(--bg-card-elevated)"
            />
          )}
        </div>
      )}
    </div>
  );
}

function BootstrapMode() {
  const checklistItems = [
    "Criar primeiros agendamentos",
    "Fechar comandas reais",
    "Atender clientes recorrentes",
    "Utilizar a agenda no dia a dia",
  ];

  const quickActions = [
    { label: "Ir para Agenda", href: "/dashboard/agenda" },
    { label: "Criar Cliente", href: "/dashboard/clients" },
    { label: "Ver Comandas", href: "/dashboard/comandas" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Bloco 1 — Explicação */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--status-yellow)",
        }}
      >
        <p
          className="font-bold text-sm mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Ainda não temos dados suficientes para gerar insights automáticos
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O LIVO aprende com agendamentos e comandas fechadas da sua barbearia.
        </p>
      </div>

      {/* Bloco 2 — Checklist */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <h3
          className="text-xs font-bold tracking-widest uppercase mb-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          Para ativar os insights
        </h3>
        <ul className="flex flex-col gap-3">
          {checklistItems.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: "rgba(0,212,160,0.12)",
                  color: "var(--status-green)",
                }}
              >
                <Check size={12} />
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bloco 3 — Ações rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="rounded-2xl p-4 text-sm font-semibold text-center hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--color-primary)",
              textDecoration: "none",
            }}
          >
            {action.label}
          </a>
        ))}
      </div>

      {/* Bloco 4 — Micro copy */}
      <p
        className="text-xs text-center"
        style={{ color: "var(--text-tertiary)" }}
      >
        Os insights aparecem automaticamente quando houver histórico suficiente
        de clientes e atendimentos.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function buildSummary(recs: Recommendation[]): RecommendationSummary {
  return {
    total: recs.length,
    high: recs.filter((r) => r.severity === "high").length,
    medium: recs.filter((r) => r.severity === "medium").length,
    low: recs.filter((r) => r.severity === "low").length,
    byType: {
      VIP_RISK: recs.filter((r) => r.type === "VIP_RISK").length,
      REACTIVATION: recs.filter((r) => r.type === "REACTIVATION").length,
      REVENUE_OPTIMIZATION: recs.filter(
        (r) => r.type === "REVENUE_OPTIMIZATION",
      ).length,
      CAPACITY_OPTIMIZATION: recs.filter(
        (r) => r.type === "CAPACITY_OPTIMIZATION",
      ).length,
    },
  };
}

export default async function InsightsPage() {
  const membership = await requireRole(["owner", "reception"]);
  const { barbershopId } = membership;

  // Gate de módulo (navegação): START → upsell.
  if (!(await hasModuleAccess(barbershopId, "insights"))) {
    redirect("/dashboard/assinar");
  }

  const [{ recommendations: all }, dismissed] = await Promise.all([
    getRecommendations(barbershopId),
    db.insightDismissal.findMany({
      where: { barbershopId },
      select: { recId: true },
    }),
  ]);

  const dismissedIds = new Set(dismissed.map((d) => d.recId));
  const recommendations = all.filter((r) => !dismissedIds.has(r.id));
  const summary = buildSummary(recommendations);

  const vipRisk = recommendations.filter((r) => r.type === "VIP_RISK");
  const reactivation = recommendations.filter((r) => r.type === "REACTIVATION");
  const otimizacao = recommendations.filter(
    (r) =>
      r.type === "REVENUE_OPTIMIZATION" || r.type === "CAPACITY_OPTIMIZATION",
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        <a
          href="/dashboard"
          className="text-sm hover:underline w-fit"
          style={{ color: "var(--color-primary)" }}
        >
          ← Dashboard
        </a>

        <SummaryHeader summary={summary} />

        {recommendations.length === 0 ? (
          <BootstrapMode />
        ) : (
          <>
            <RecommendationSection
              title="Clientes VIP em Risco"
              recommendations={vipRisk}
            />
            <RecommendationSection
              title="Reativação de Clientes"
              recommendations={reactivation}
            />
            <RecommendationSection
              title="Otimização da Barbearia"
              recommendations={otimizacao}
            />
          </>
        )}
      </main>
    </div>
  );
}
