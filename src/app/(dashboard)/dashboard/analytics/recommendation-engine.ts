// Motor de recomendação do LIVO.
// Leitura pura: consome dados de client-intelligence.ts e gera sugestões estruturadas.
// Nenhum write, nenhum auth — barbershopId deve vir de contexto já autenticado (page.tsx).

import {
  type AgendaIntelligenceResult,
  type AgendaSlotIntelligence,
  type ClienteKPI,
  type ClientIntelligenceResult,
  getAgendaIntelligence,
  getClientIntelligence,
  type PeriodoAnalytics,
} from "./client-intelligence";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecommendationType =
  | "REACTIVATION"
  | "VIP_RISK"
  | "REVENUE_OPTIMIZATION"
  | "CAPACITY_OPTIMIZATION";

export type RecommendationSeverity = "low" | "medium" | "high";
export type RecommendationImpact = "baixo" | "médio" | "alto";

export type RecommendationMetadata = {
  clientId?: string;
  clientName?: string;
  professionalId?: string;
  professionalName?: string;
  hora?: number;
  diasInativo?: number;
  totalReceita?: number;
  ticketMedio?: number;
};

export type Recommendation = {
  id: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  reason: string;
  suggestedAction: string;
  estimatedImpact: RecommendationImpact;
  metadata: RecommendationMetadata;
};

export type RecommendationSummary = {
  total: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<RecommendationType, number>;
};

export type RecommendationResult = {
  recommendations: Recommendation[];
  summary: RecommendationSummary;
};

// ─── Thresholds ───────────────────────────────────────────────────────────────

// Cliente VIP: R$300+ em receita histórica OU 8+ visitas
const VIP_RECEITA = 30_000;
const VIP_VISITS = 8;

// Cliente de valor elevado (abaixo de VIP mas acima de anônimo)
const HIGH_VALUE_RECEITA = 10_000; // R$100
const HIGH_VALUE_VISITS = 3;

// Profissional subutilizado: receita < 40% do top performer no período
const CAPACITY_RATIO = 0.4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(cents: number): string {
  return `R$${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

function isVip(c: ClienteKPI): boolean {
  return c.totalReceita >= VIP_RECEITA || c.totalVisits >= VIP_VISITS;
}

function isHighValue(c: ClienteKPI): boolean {
  return (
    c.totalReceita >= HIGH_VALUE_RECEITA || c.totalVisits >= HIGH_VALUE_VISITS
  );
}

// ─── Regra: VIP_RISK ──────────────────────────────────────────────────────────
// Clientes de alto valor que estão em risco ou inativos.

function vipRiskRules(clientData: ClientIntelligenceResult): {
  recs: Recommendation[];
  vipIds: Set<string>;
} {
  const vipAtRisk = [...clientData.emRisco, ...clientData.inativos]
    .filter(isVip)
    .sort((a, b) => b.totalReceita - a.totalReceita)
    .slice(0, 5);

  const vipIds = new Set(vipAtRisk.map((c) => c.clientId));

  const recs: Recommendation[] = vipAtRisk.map((c) => ({
    id: `VIP_RISK_${c.clientId}`,
    type: "VIP_RISK",
    severity: c.status === "inativo" ? "high" : "medium",
    reason: `${c.name} é um cliente VIP (${brl(c.totalReceita)} em receita histórica, ${c.totalVisits} visitas) e está há ${c.diasSemVisita ?? "?"} dias sem aparecer.`,
    suggestedAction: `Contatar ${c.name} diretamente com oferta exclusiva de retorno. Última visita: ${c.lastVisitAt ? formatDate(c.lastVisitAt) : "não registrada"}.`,
    estimatedImpact: "alto",
    metadata: {
      clientId: c.clientId,
      clientName: c.name,
      diasInativo: c.diasSemVisita ?? undefined,
      totalReceita: c.totalReceita,
      ticketMedio: c.ticketMedio,
    },
  }));

  return { recs, vipIds };
}

// ─── Regra: REACTIVATION ──────────────────────────────────────────────────────
// Clientes em risco ou inativos (excluindo os já cobertos por VIP_RISK).

function reactivationRules(
  clientData: ClientIntelligenceResult,
  excludeIds: Set<string>,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Clientes em risco (top 5, sem VIPs)
  const emRisco = clientData.emRisco
    .filter((c) => !excludeIds.has(c.clientId))
    .slice(0, 5);

  for (const c of emRisco) {
    const highValue = isHighValue(c);
    const freqHint = c.intervaloMedioVisitas
      ? ` (frequência habitual: a cada ${c.intervaloMedioVisitas} dias)`
      : "";
    recs.push({
      id: `REACTIVATION_${c.clientId}`,
      type: "REACTIVATION",
      severity: highValue ? "medium" : "low",
      reason: `${c.name} está há ${c.diasSemVisita} dias sem visitar e apresenta risco de churn${freqHint}.`,
      suggestedAction: `Enviar mensagem de retorno para ${c.name}. Ticket médio: ${brl(c.ticketMedio)}.`,
      estimatedImpact: highValue ? "médio" : "baixo",
      metadata: {
        clientId: c.clientId,
        clientName: c.name,
        diasInativo: c.diasSemVisita ?? undefined,
        totalReceita: c.totalReceita,
        ticketMedio: c.ticketMedio,
      },
    });
  }

  // Inativos de valor (top 3, sem VIPs e sem os já listados como em risco)
  const covered = new Set([...excludeIds, ...emRisco.map((c) => c.clientId)]);
  const inativosDeValor = clientData.inativos
    .filter((c) => !covered.has(c.clientId) && isHighValue(c))
    .slice(0, 3);

  for (const c of inativosDeValor) {
    recs.push({
      id: `REACTIVATION_INATIVO_${c.clientId}`,
      type: "REACTIVATION",
      severity: "low",
      reason: `${c.name} está inativo há ${c.diasSemVisita} dias. Receita histórica: ${brl(c.totalReceita)}.`,
      suggestedAction: `Tentar reativação com desconto ou mensagem personalizada para ${c.name}.`,
      estimatedImpact: "baixo",
      metadata: {
        clientId: c.clientId,
        clientName: c.name,
        diasInativo: c.diasSemVisita ?? undefined,
        totalReceita: c.totalReceita,
        ticketMedio: c.ticketMedio,
      },
    });
  }

  return recs;
}

// ─── Regra: REVENUE_OPTIMIZATION ─────────────────────────────────────────────
// Faixas horárias com baixa ocupação — potencial receita não capturada.

function revenueOptimizationRules(
  agendaData: AgendaIntelligenceResult,
): Recommendation[] {
  if (agendaData.horariosOciosos.length === 0) return [];

  // Agrupar horários ociosos consecutivos para recomendações mais legíveis
  const sorted = [...agendaData.horariosOciosos].sort(
    (a, b) => a.hora - b.hora,
  );
  const firstSlot = sorted[0];
  if (!firstSlot) return [];

  const groups: AgendaSlotIntelligence[][] = [];
  let current: AgendaSlotIntelligence[] = [firstSlot];

  for (let i = 1; i < sorted.length; i++) {
    const slot = sorted[i];
    const prev = current[current.length - 1];
    if (slot && prev && slot.hora === prev.hora + 1) {
      current.push(slot);
    } else if (slot) {
      groups.push(current);
      current = [slot];
    }
  }
  groups.push(current);

  return groups.slice(0, 3).flatMap((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) return [];

    const label =
      group.length === 1 ? first.label : `${first.label}–${last.label}`;
    const totalAtendimentos = group.reduce((s, g) => s + g.totalComandas, 0);
    const isEmpty = totalAtendimentos === 0;

    return [
      {
        id: `REVENUE_OPT_${first.hora}`,
        type: "REVENUE_OPTIMIZATION" as const,
        severity: (isEmpty ? "medium" : "low") as RecommendationSeverity,
        reason: `Horário ${label} teve baixa ocupação em ${agendaData.periodoLabel}: ${totalAtendimentos} atendimento${totalAtendimentos !== 1 ? "s" : ""}.`,
        suggestedAction: `Criar promoção para ${label} ou redistribuir clientes para aproveitar a capacidade ociosa.`,
        estimatedImpact: "médio" as const,
        metadata: { hora: first.hora },
      },
    ];
  });
}

// ─── Regra: CAPACITY_OPTIMIZATION ────────────────────────────────────────────
// Profissionais com volume muito abaixo do top performer no período.

function capacityOptimizationRules(
  agendaData: AgendaIntelligenceResult,
): Recommendation[] {
  if (agendaData.topProfissionais.length < 2) return [];

  const top = agendaData.topProfissionais[0];
  if (!top || top.totalReceita === 0) return [];

  const threshold = top.totalReceita * CAPACITY_RATIO;
  const underperforming = agendaData.topProfissionais
    .slice(1)
    .filter((p) => p.totalComandas > 0 && p.totalReceita < threshold);

  return underperforming.slice(0, 2).map((prof) => {
    const pct = Math.round((prof.totalReceita / top.totalReceita) * 100);
    return {
      id: `CAPACITY_OPT_${prof.professionalId}`,
      type: "CAPACITY_OPTIMIZATION" as const,
      severity: "low" as const,
      reason: `${prof.name} gerou ${pct}% da receita de ${top.name} em ${agendaData.periodoLabel} (${brl(prof.totalReceita)} vs ${brl(top.totalReceita)}).`,
      suggestedAction: `Revisar agenda de ${prof.name}: verificar horários disponíveis, distribuição de clientes e serviços ofertados.`,
      estimatedImpact: "médio" as const,
      metadata: {
        professionalId: prof.professionalId,
        professionalName: prof.name,
        totalReceita: prof.totalReceita,
        ticketMedio: prof.ticketMedio,
      },
    };
  });
}

// ─── Engine ───────────────────────────────────────────────────────────────────

function buildRecommendations(
  clientData: ClientIntelligenceResult,
  agendaData: AgendaIntelligenceResult,
): RecommendationResult {
  const { recs: vipRecs, vipIds } = vipRiskRules(clientData);
  const reactivationRecs = reactivationRules(clientData, vipIds);
  const revenueRecs = revenueOptimizationRules(agendaData);
  const capacityRecs = capacityOptimizationRules(agendaData);

  const all = [
    ...vipRecs,
    ...reactivationRecs,
    ...revenueRecs,
    ...capacityRecs,
  ];

  const order: Record<RecommendationSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  all.sort((a, b) => order[a.severity] - order[b.severity]);

  const summary: RecommendationSummary = {
    total: all.length,
    high: all.filter((r) => r.severity === "high").length,
    medium: all.filter((r) => r.severity === "medium").length,
    low: all.filter((r) => r.severity === "low").length,
    byType: {
      REACTIVATION: all.filter((r) => r.type === "REACTIVATION").length,
      VIP_RISK: all.filter((r) => r.type === "VIP_RISK").length,
      REVENUE_OPTIMIZATION: all.filter((r) => r.type === "REVENUE_OPTIMIZATION")
        .length,
      CAPACITY_OPTIMIZATION: all.filter(
        (r) => r.type === "CAPACITY_OPTIMIZATION",
      ).length,
    },
  };

  return { recommendations: all, summary };
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function getRecommendations(
  barbershopId: string,
  thresholds: { risco: number; inativo: number } = { risco: 30, inativo: 60 },
  periodo: PeriodoAnalytics = "mes",
): Promise<RecommendationResult> {
  const [clientData, agendaData] = await Promise.all([
    getClientIntelligence(barbershopId, thresholds),
    getAgendaIntelligence(barbershopId, periodo),
  ]);
  return buildRecommendations(clientData, agendaData);
}
