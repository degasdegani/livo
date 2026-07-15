"use server";

import { PlanStatus } from "@prisma/client";
import { requireRole } from "@/lib/permissions";
import { cancelAsaasSubscription, getSubscriptionPayments } from "@/lib/asaas";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

export interface FaturaItem {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string;
}

export interface FaturamentoData {
  planStatus: PlanStatus;
  plan: string;
  trialEndsAt: string | null;
  freeMonthCredits: number;
  proximoVencimento: string | null;
  faturas: FaturaItem[];
  erroAsaas?: string;
}

export async function getFaturamentoData(): Promise<FaturamentoData> {
  const membership = await requireRole(["owner"]);

  const barbershop = await db.barbershop.findUniqueOrThrow({
    where: { id: membership.barbershopId },
    select: {
      planStatus: true,
      plan: true,
      trialEndsAt: true,
      freeMonthCredits: true,
      asaasSubscriptionId: true,
    },
  });

  const base: FaturamentoData = {
    planStatus: barbershop.planStatus,
    plan: barbershop.plan,
    trialEndsAt: barbershop.trialEndsAt?.toISOString() ?? null,
    freeMonthCredits: barbershop.freeMonthCredits,
    proximoVencimento: null,
    faturas: [],
  };

  // Lifetime e trial não têm assinatura Asaas ainda — nada a buscar.
  if (!barbershop.asaasSubscriptionId) {
    return base;
  }

  try {
    const payments = await getSubscriptionPayments(barbershop.asaasSubscriptionId);
    const faturas: FaturaItem[] = payments.data.map((p) => ({
      id: p.id,
      status: p.status,
      value: p.value,
      dueDate: p.dueDate,
      invoiceUrl: p.invoiceUrl,
    }));

    const emAberto = faturas
      .filter((f) => f.status === "PENDING" || f.status === "AWAITING_RISK_ANALYSIS")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      ...base,
      proximoVencimento: emAberto[0]?.dueDate ?? null,
      faturas: faturas.sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    };
  } catch (err) {
    log.billing.error(
      "erro ao buscar faturas Asaas",
      { barbershopId: membership.barbershopId },
      err,
    );
    return {
      ...base,
      erroAsaas:
        "Não foi possível carregar o histórico de faturas agora. Tente novamente em instantes.",
    };
  }
}

export interface CancelResult {
  success?: boolean;
  error?: string;
}

export async function cancelSubscriptionAction(): Promise<CancelResult> {
  const membership = await requireRole(["owner"]);

  const barbershop = await db.barbershop.findUniqueOrThrow({
    where: { id: membership.barbershopId },
    select: { planStatus: true, asaasSubscriptionId: true },
  });

  if (barbershop.planStatus === PlanStatus.lifetime) {
    return { error: "Contas com acesso vitalício não podem ser canceladas." };
  }

  if (!barbershop.asaasSubscriptionId) {
    return { error: "Nenhuma assinatura ativa para cancelar." };
  }

  if (barbershop.planStatus === PlanStatus.cancelled) {
    return { error: "Assinatura já está cancelada." };
  }

  try {
    await cancelAsaasSubscription(barbershop.asaasSubscriptionId);
    log.billing.info("cancelamento solicitado pelo owner", {
      barbershopId: membership.barbershopId,
      subscriptionId: barbershop.asaasSubscriptionId,
    });
    // NÃO atualiza planStatus aqui — fonte única de verdade é o webhook
    // (SUBSCRIPTION_DELETED), mesmo princípio já usado em /dashboard/assinar.
    return { success: true };
  } catch (err) {
    log.billing.error(
      "erro ao cancelar assinatura",
      { barbershopId: membership.barbershopId, subscriptionId: barbershop.asaasSubscriptionId },
      err,
    );
    return { error: "Erro ao cancelar assinatura. Tente novamente ou contate o suporte." };
  }
}
