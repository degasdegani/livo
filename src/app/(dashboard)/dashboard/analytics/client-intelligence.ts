// Camada de inteligência de cliente do LIVO.
// Leitura pura: somente Client (totalVisits/lastVisitAt) e Comanda (closed, totalInCents).
// Nenhum write, nenhum auth — barbershopId deve vir de contexto já autenticado (page.tsx).

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClienteStatus = "ativo" | "em_risco" | "inativo";

export type ClienteKPI = {
  clientId: string;
  name: string;
  phone: string | null;
  totalVisits: number;
  lastVisitAt: Date | null;
  diasSemVisita: number | null;
  totalReceita: number;
  ticketMedio: number;
  intervaloMedioVisitas: number | null;
  status: ClienteStatus;
};

export type ClientIntelligenceResult = {
  ativos: ClienteKPI[];
  emRisco: ClienteKPI[];
  inativos: ClienteKPI[];
  totais: {
    total: number;
    ativos: number;
    emRisco: number;
    inativos: number;
    taxaAtividade: number;
  };
  thresholds: { risco: number; inativo: number };
};

export type AgendaSlotStatus = "quente" | "normal" | "ocioso";

export type AgendaSlotIntelligence = {
  hora: number;
  label: string;
  totalComandas: number;
  totalReceitaCents: number;
  ticketMedioHora: number;
  status: AgendaSlotStatus;
};

export type ProfissionalIntelligence = {
  professionalId: string;
  name: string;
  totalComandas: number;
  totalReceita: number;
  ticketMedio: number;
  clientesUnicos: number;
};

export type PeriodoAnalytics = "mes" | "mes_anterior" | "trimestre";

export type AgendaIntelligenceResult = {
  slotsPorHora: AgendaSlotIntelligence[];
  topProfissionais: ProfissionalIntelligence[];
  melhorHorario: AgendaSlotIntelligence | null;
  horariosOciosos: AgendaSlotIntelligence[];
  periodoLabel: string;
};

export type ReativacaoSugestao = {
  clientId: string;
  name: string;
  phone: string | null;
  diasInativo: number;
  totalReceita: number;
  ticketMedio: number;
  totalVisits: number;
  prioridade: "alta" | "media";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasDesde(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function classifyStatus(
  diasSemVisita: number | null,
  intervaloMedioVisitas: number | null,
  thresholds: { risco: number; inativo: number },
): ClienteStatus {
  if (diasSemVisita === null) return "inativo";

  // Threshold dinâmico: usa o ritmo histórico do próprio cliente quando disponível
  if (intervaloMedioVisitas && intervaloMedioVisitas > 0) {
    if (diasSemVisita <= intervaloMedioVisitas * 1.5) return "ativo";
    if (diasSemVisita <= intervaloMedioVisitas * 3) return "em_risco";
    return "inativo";
  }

  // Fallback para clientes com apenas 1 visita registrada
  if (diasSemVisita <= thresholds.risco) return "ativo";
  if (diasSemVisita <= thresholds.inativo) return "em_risco";
  return "inativo";
}

function calcularPeriodo(periodo: PeriodoAnalytics): {
  inicio: Date;
  fim: Date;
  periodoLabel: string;
} {
  const agora = new Date();

  if (periodo === "mes") {
    return {
      inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
      fim: new Date(
        agora.getFullYear(),
        agora.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
      periodoLabel: "Mês atual",
    };
  }

  if (periodo === "mes_anterior") {
    return {
      inicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
      fim: new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999),
      periodoLabel: "Mês anterior",
    };
  }

  return {
    inicio: new Date(agora.getFullYear(), agora.getMonth() - 2, 1),
    fim: new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
    periodoLabel: "Últimos 3 meses",
  };
}

// ─── 1. INTELIGÊNCIA DE CLIENTE ───────────────────────────────────────────────

async function getClientIntelligenceImpl(
  barbershopId: string,
  thresholds: { risco: number; inativo: number } = { risco: 30, inativo: 60 },
): Promise<ClientIntelligenceResult> {
  const clients = await db.client.findMany({
    where: { barbershopId, bloqueado: false, totalVisits: { gt: 0 } },
    select: {
      id: true,
      name: true,
      phone: true,
      totalVisits: true,
      lastVisitAt: true,
    },
  });

  if (clients.length === 0) {
    return {
      ativos: [],
      emRisco: [],
      inativos: [],
      totais: {
        total: 0,
        ativos: 0,
        emRisco: 0,
        inativos: 0,
        taxaAtividade: 0,
      },
      thresholds,
    };
  }

  const clientIds = clients.map((c) => c.id);

  // Receita total por cliente via comandas fechadas
  const revenueGroups = await db.comanda.groupBy({
    by: ["clientId"],
    where: { barbershopId, clientId: { in: clientIds }, status: "closed" },
    _sum: { totalInCents: true },
  });

  const revenueMap = new Map<string, number>();
  for (const r of revenueGroups) {
    if (r.clientId) revenueMap.set(r.clientId, r._sum.totalInCents ?? 0);
  }

  // Intervalo médio entre visitas para clientes com ≥2 registros
  // Estimativa: span(últimaVisita - primeiraComanda) / (totalVisits - 1)
  const multiVisitIds = clients
    .filter((c) => c.totalVisits >= 2)
    .map((c) => c.id);
  const intervaloMap = new Map<string, number>();

  if (multiVisitIds.length > 0) {
    const firstComandas = await db.comanda.findMany({
      where: {
        barbershopId,
        clientId: { in: multiVisitIds },
        status: "closed",
        closedAt: { not: null },
      },
      select: { clientId: true, closedAt: true },
      orderBy: { closedAt: "asc" },
      distinct: ["clientId"],
    });

    for (const row of firstComandas) {
      if (!row.clientId || !row.closedAt) continue;
      const client = clients.find((c) => c.id === row.clientId);
      if (!client?.lastVisitAt || client.totalVisits < 2) continue;

      const spanDays = Math.floor(
        (client.lastVisitAt.getTime() - row.closedAt.getTime()) / 86_400_000,
      );
      const interval = Math.round(spanDays / (client.totalVisits - 1));
      if (interval > 0) intervaloMap.set(row.clientId, interval);
    }
  }

  const kpis: ClienteKPI[] = clients.map((c) => {
    const totalReceita = revenueMap.get(c.id) ?? 0;
    const ticketMedio =
      c.totalVisits > 0 ? Math.round(totalReceita / c.totalVisits) : 0;
    const diasSemVisita = diasDesde(c.lastVisitAt);
    const intervaloMedioVisitas = intervaloMap.get(c.id) ?? null;

    return {
      clientId: c.id,
      name: c.name,
      phone: c.phone,
      totalVisits: c.totalVisits,
      lastVisitAt: c.lastVisitAt,
      diasSemVisita,
      totalReceita,
      ticketMedio,
      intervaloMedioVisitas,
      status: classifyStatus(diasSemVisita, intervaloMedioVisitas, thresholds),
    };
  });

  const byRevenue = (a: ClienteKPI, b: ClienteKPI) =>
    b.totalReceita - a.totalReceita;
  const ativos = kpis.filter((k) => k.status === "ativo").sort(byRevenue);
  const emRisco = kpis.filter((k) => k.status === "em_risco").sort(byRevenue);
  const inativos = kpis.filter((k) => k.status === "inativo").sort(byRevenue);
  const total = kpis.length;

  return {
    ativos,
    emRisco,
    inativos,
    totais: {
      total,
      ativos: ativos.length,
      emRisco: emRisco.length,
      inativos: inativos.length,
      taxaAtividade: total > 0 ? Math.round((ativos.length / total) * 100) : 0,
    },
    thresholds,
  };
}

const getClientIntelligenceCached = unstable_cache(
  getClientIntelligenceImpl,
  ["client-intelligence"],
  { revalidate: 300 },
);

export async function getClientIntelligence(
  barbershopId: string,
  thresholds: { risco: number; inativo: number } = { risco: 30, inativo: 60 },
): Promise<ClientIntelligenceResult> {
  return getClientIntelligenceCached(barbershopId, thresholds);
}

// ─── 2. INTELIGÊNCIA DE AGENDA ────────────────────────────────────────────────

async function getAgendaIntelligenceImpl(
  barbershopId: string,
  periodo: PeriodoAnalytics = "mes",
): Promise<AgendaIntelligenceResult> {
  const { inicio, fim, periodoLabel } = calcularPeriodo(periodo);

  const comandas = await db.comanda.findMany({
    where: {
      barbershopId,
      status: "closed",
      closedAt: { gte: inicio, lte: fim },
    },
    select: {
      totalInCents: true,
      closedAt: true,
      professionalId: true,
      clientId: true,
      professional: { select: { id: true, name: true } },
    },
  });

  // Distribuição por hora do dia (7h–21h)
  const slotMap = new Map<number, { count: number; receita: number }>();
  for (let h = 7; h <= 21; h++) slotMap.set(h, { count: 0, receita: 0 });

  for (const c of comandas) {
    if (!c.closedAt) continue;
    const hora = c.closedAt.getHours();
    if (hora < 7 || hora > 21) continue;
    const slot = slotMap.get(hora);
    if (slot)
      slotMap.set(hora, {
        count: slot.count + 1,
        receita: slot.receita + c.totalInCents,
      });
  }

  // Média calculada sobre slots com movimento (ignora horários completamente vazios)
  const slotsComMovimento = Array.from(slotMap.values()).filter(
    (v) => v.count > 0,
  );
  const totalComandasPeriodo = slotsComMovimento.reduce(
    (s, v) => s + v.count,
    0,
  );
  const mediaSlot =
    slotsComMovimento.length > 0
      ? totalComandasPeriodo / slotsComMovimento.length
      : 0;

  const slotsPorHora: AgendaSlotIntelligence[] = Array.from(
    slotMap.entries(),
  ).map(([hora, { count, receita }]) => {
    let status: AgendaSlotStatus = "normal";
    if (count >= mediaSlot * 1.5) status = "quente";
    else if (count < mediaSlot * 0.5) status = "ocioso";

    return {
      hora,
      label: `${hora.toString().padStart(2, "0")}:00`,
      totalComandas: count,
      totalReceitaCents: receita,
      ticketMedioHora: count > 0 ? Math.round(receita / count) : 0,
      status,
    };
  });

  const melhorHorario = slotsPorHora.reduce<AgendaSlotIntelligence | null>(
    (best, s) =>
      !best || s.totalReceitaCents > best.totalReceitaCents ? s : best,
    null,
  );
  const horariosOciosos = slotsPorHora.filter((s) => s.status === "ocioso");

  // Ranking de profissionais por receita
  const profMap = new Map<
    string,
    { name: string; count: number; receita: number; clientIds: Set<string> }
  >();

  for (const c of comandas) {
    const pid = c.professionalId;
    const existing = profMap.get(pid);
    const entry = existing ?? {
      name: c.professional.name,
      count: 0,
      receita: 0,
      clientIds: new Set<string>(),
    };
    entry.count += 1;
    entry.receita += c.totalInCents;
    if (c.clientId) entry.clientIds.add(c.clientId);
    profMap.set(pid, entry);
  }

  const topProfissionais: ProfissionalIntelligence[] = Array.from(
    profMap.entries(),
  )
    .map(([pid, d]) => ({
      professionalId: pid,
      name: d.name,
      totalComandas: d.count,
      totalReceita: d.receita,
      ticketMedio: d.count > 0 ? Math.round(d.receita / d.count) : 0,
      clientesUnicos: d.clientIds.size,
    }))
    .sort((a, b) => b.totalReceita - a.totalReceita);

  return {
    slotsPorHora,
    topProfissionais,
    melhorHorario,
    horariosOciosos,
    periodoLabel,
  };
}

const getAgendaIntelligenceCached = unstable_cache(
  getAgendaIntelligenceImpl,
  ["agenda-intelligence"],
  { revalidate: 300 },
);

export async function getAgendaIntelligence(
  barbershopId: string,
  periodo: PeriodoAnalytics = "mes",
): Promise<AgendaIntelligenceResult> {
  return getAgendaIntelligenceCached(barbershopId, periodo);
}

// ─── 3. SUGESTÕES DE REATIVAÇÃO ───────────────────────────────────────────────

export async function getReativacaoSugestoes(
  barbershopId: string,
  thresholds: { risco: number; inativo: number } = { risco: 30, inativo: 60 },
  limite = 20,
): Promise<ReativacaoSugestao[]> {
  const cutoffRisco = new Date(Date.now() - thresholds.risco * 86_400_000);

  // Clientes com pelo menos 1 visita e que não aparecem desde o limite de risco
  const clients = await db.client.findMany({
    where: {
      barbershopId,
      bloqueado: false,
      totalVisits: { gt: 0 },
      OR: [{ lastVisitAt: { lt: cutoffRisco } }, { lastVisitAt: null }],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      totalVisits: true,
      lastVisitAt: true,
    },
  });

  if (clients.length === 0) return [];

  const revenueGroups = await db.comanda.groupBy({
    by: ["clientId"],
    where: {
      barbershopId,
      clientId: { in: clients.map((c) => c.id) },
      status: "closed",
    },
    _sum: { totalInCents: true },
  });

  const revenueMap = new Map<string, number>();
  for (const r of revenueGroups) {
    if (r.clientId) revenueMap.set(r.clientId, r._sum.totalInCents ?? 0);
  }

  return clients
    .map((c) => {
      const totalReceita = revenueMap.get(c.id) ?? 0;
      const diasInativo = diasDesde(c.lastVisitAt) ?? 999;
      const ticketMedio =
        c.totalVisits > 0 ? Math.round(totalReceita / c.totalVisits) : 0;
      // Alta prioridade: cliente de valor (R$200+ em receita total ou 5+ visitas)
      const prioridade: "alta" | "media" =
        totalReceita >= 20_000 || c.totalVisits >= 5 ? "alta" : "media";

      return {
        clientId: c.id,
        name: c.name,
        phone: c.phone,
        diasInativo,
        totalReceita,
        ticketMedio,
        totalVisits: c.totalVisits,
        prioridade,
      };
    })
    .sort((a, b) => {
      if (a.prioridade !== b.prioridade)
        return a.prioridade === "alta" ? -1 : 1;
      return b.totalReceita - a.totalReceita;
    })
    .slice(0, limite);
}
