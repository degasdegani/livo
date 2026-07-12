// src/lib/reports/queries.ts
// Queries de leitura pura para exportação de relatórios. Toda função recebe
// barbershopId (escopo multi-tenant obrigatório) + período opcional. Valores
// monetários saem em centavos (number cru) — conversão para "R$ 1.234,56"
// acontece só na camada de export (src/lib/reports/export.ts).

import { db } from "@/lib/db";

export type Periodo = { from: Date; to: Date };

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  voucher: "Voucher",
  cortesia: "Cortesia",
  convenio: "Convênio",
  outros: "Outros",
};

function traduzirMetodo(metodo: string): string {
  return PAYMENT_METHOD_LABELS[metodo] ?? metodo;
}

function formatarMetodosPagamento(
  payments: { method: string }[],
  paymentMethodFallback: string | null,
): string {
  if (payments.length > 0) {
    const unicos = Array.from(new Set(payments.map((p) => p.method)));
    return unicos.map(traduzirMetodo).join(", ");
  }
  return paymentMethodFallback ? traduzirMetodo(paymentMethodFallback) : "Não informado";
}

export function formatarPeriodoLabel(periodo?: Periodo): string {
  if (!periodo) return "Todo o histórico";
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${fmt(periodo.from)} - ${fmt(periodo.to)}`;
}

// ── Faturamento ────────────────────────────────────────────────────────────

export type FaturamentoRow = {
  closedAt: Date | null;
  clientName: string;
  professionalName: string;
  paymentMethods: string;
  totalInCents: number;
  commissionInCents: number;
  liquidoInCents: number;
};

export async function getFaturamentoReport(
  barbershopId: string,
  periodo?: Periodo,
): Promise<FaturamentoRow[]> {
  const comandas = await db.comanda.findMany({
    where: {
      barbershopId,
      status: "closed",
      ...(periodo && { closedAt: { gte: periodo.from, lte: periodo.to } }),
    },
    select: {
      closedAt: true,
      clientName: true,
      totalInCents: true,
      paymentMethod: true,
      professional: { select: { name: true } },
      payments: { select: { method: true } },
      items: { select: { commissionValue: true } },
    },
    orderBy: { closedAt: "desc" },
  });

  return comandas.map((c) => {
    const commissionInCents = c.items.reduce(
      (s, i) => s + (i.commissionValue ?? 0),
      0,
    );
    return {
      closedAt: c.closedAt,
      clientName: c.clientName,
      professionalName: c.professional.name,
      paymentMethods: formatarMetodosPagamento(c.payments, c.paymentMethod),
      totalInCents: c.totalInCents,
      commissionInCents,
      liquidoInCents: c.totalInCents - commissionInCents,
    };
  });
}

// ── Comissões ──────────────────────────────────────────────────────────────

export type ComissoesRow = {
  professionalName: string;
  periodoLabel: string;
  valorGeradoInCents: number;
  valorComissaoInCents: number;
};

export async function getComissoesReport(
  barbershopId: string,
  periodo?: Periodo,
): Promise<ComissoesRow[]> {
  const items = await db.comandaItem.findMany({
    where: {
      commissionValue: { not: null },
      comanda: {
        barbershopId,
        status: "closed",
        ...(periodo && { closedAt: { gte: periodo.from, lte: periodo.to } }),
      },
    },
    select: {
      totalInCents: true,
      commissionValue: true,
      comanda: {
        select: { professionalId: true, professional: { select: { name: true } } },
      },
    },
  });

  const porProfissional = new Map<
    string,
    { professionalName: string; valorGeradoInCents: number; valorComissaoInCents: number }
  >();

  for (const item of items) {
    const key = item.comanda.professionalId;
    const atual = porProfissional.get(key) ?? {
      professionalName: item.comanda.professional.name,
      valorGeradoInCents: 0,
      valorComissaoInCents: 0,
    };
    atual.valorGeradoInCents += item.totalInCents;
    atual.valorComissaoInCents += item.commissionValue ?? 0;
    porProfissional.set(key, atual);
  }

  const periodoLabel = formatarPeriodoLabel(periodo);
  return Array.from(porProfissional.values())
    .map((v) => ({ ...v, periodoLabel }))
    .sort((a, b) => b.valorComissaoInCents - a.valorComissaoInCents);
}

// ── Comandas ───────────────────────────────────────────────────────────────

export type ComandasRow = {
  openedAt: Date;
  closedAt: Date | null;
  clientName: string;
  professionalName: string;
  status: string;
  paymentMethods: string;
  itemsSummary: string;
  totalInCents: number;
};

export async function getComandasReport(
  barbershopId: string,
  periodo?: Periodo,
): Promise<ComandasRow[]> {
  const comandas = await db.comanda.findMany({
    where: {
      barbershopId,
      ...(periodo && { openedAt: { gte: periodo.from, lte: periodo.to } }),
    },
    select: {
      openedAt: true,
      closedAt: true,
      clientName: true,
      status: true,
      totalInCents: true,
      paymentMethod: true,
      professional: { select: { name: true } },
      payments: { select: { method: true } },
      items: { select: { type: true, serviceName: true, productName: true, quantity: true } },
    },
    orderBy: { openedAt: "desc" },
  });

  return comandas.map((c) => ({
    openedAt: c.openedAt,
    closedAt: c.closedAt,
    clientName: c.clientName,
    professionalName: c.professional.name,
    status: c.status,
    paymentMethods: formatarMetodosPagamento(c.payments, c.paymentMethod),
    itemsSummary: c.items
      .map((i) => `${i.type === "service" ? i.serviceName : i.productName} x${i.quantity}`)
      .join(", "),
    totalInCents: c.totalInCents,
  }));
}

// ── Clientes ───────────────────────────────────────────────────────────────

export type ClientesRow = {
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  lastVisitAt: Date | null;
  totalVisits: number;
  origem: string | null;
  birthDate: Date | null;
  cpf: string | null;
};

export async function getClientesReport(barbershopId: string): Promise<ClientesRow[]> {
  // LGPD: clientes que já pediram esquecimento (anonymizedAt preenchido) nunca
  // são exportados.
  return db.client.findMany({
    where: { barbershopId, anonymizedAt: null },
    select: {
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      lastVisitAt: true,
      totalVisits: true,
      origem: true,
      birthDate: true,
      cpf: true,
    },
    orderBy: { name: "asc" },
  });
}

// ── Assinaturas (Clube) ──────────────────────────────────────────────────────

export type AssinaturasRow = {
  clientName: string;
  planName: string;
  status: string;
  startedAt: Date | null;
  currentPeriodEnd: Date | null;
  priceInCents: number;
};

export async function getAssinaturasReport(
  barbershopId: string,
): Promise<AssinaturasRow[]> {
  const subscriptions = await db.clientSubscription.findMany({
    where: { barbershopId },
    select: {
      status: true,
      startedAt: true,
      currentPeriodEnd: true,
      client: { select: { name: true } },
      plan: { select: { name: true, priceInCents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return subscriptions.map((s) => ({
    clientName: s.client.name,
    planName: s.plan.name,
    status: s.status,
    startedAt: s.startedAt,
    currentPeriodEnd: s.currentPeriodEnd,
    priceInCents: s.plan.priceInCents,
  }));
}

// ── Pacotes ────────────────────────────────────────────────────────────────

export type PacotesRow = {
  clientName: string;
  packageName: string;
  paymentStatus: string;
  priceInCents: number;
  expiresAt: Date | null;
  uso: string;
};

export async function getPacotesReport(barbershopId: string): Promise<PacotesRow[]> {
  const clientPackages = await db.clientPackage.findMany({
    where: { barbershopId },
    select: {
      paymentStatus: true,
      priceInCents: true,
      expiresAt: true,
      client: { select: { name: true } },
      package: { select: { name: true } },
      items: { select: { quantityUsed: true, quantityTotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return clientPackages.map((cp) => {
    const usado = cp.items.reduce((s, i) => s + i.quantityUsed, 0);
    const total = cp.items.reduce((s, i) => s + i.quantityTotal, 0);
    return {
      clientName: cp.client.name,
      packageName: cp.package.name,
      paymentStatus: cp.paymentStatus,
      priceInCents: cp.priceInCents,
      expiresAt: cp.expiresAt,
      uso: `${usado}/${total}`,
    };
  });
}
