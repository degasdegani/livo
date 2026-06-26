"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { isClubEnabled, requireClubEnabled } from "@/lib/clube-flag";
import { validarCNPJ, createAsaasSubaccount, configureClubWebhook } from "@/lib/asaas-clube";
import { revalidatePath } from "next/cache";
import { BarberCommissionMode } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos de retorno
// ---------------------------------------------------------------------------

export type PlanItemInput = {
  serviceId: string;
  quantityPerCycle: number;
  barberCommissionInCents?: number | null;
};

export type PlanProductDiscountInput = {
  productId: string;
  discountPct?: number | null;
  discountInCents?: number | null;
};

export type CreatePlanInput = {
  name: string;
  description?: string | null;
  priceInCents: number;
  barberCommissionMode: BarberCommissionMode;
  maxSlots?: number | null;
  items: PlanItemInput[];
  productDiscounts: PlanProductDiscountInput[];
};

export type UpdatePlanInput = CreatePlanInput & { planId: string };

// ---------------------------------------------------------------------------
// getClubData — leitura (sem requireClubEnabled: owner vê mesmo com flag off)
// ---------------------------------------------------------------------------

export async function getClubData() {
  const { barbershopId } = await requireRole(["owner"]);

  const [plans, services, products, clubEnabled] = await Promise.all([
    db.subscriptionPlan.findMany({
      where: { barbershopId },
      include: {
        items: { include: { service: true } },
        productDiscounts: { include: { product: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.service.findMany({
      where: { barbershopId, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { barbershopId },
      orderBy: { name: "asc" },
    }),
    isClubEnabled(barbershopId),
  ]);

  return { plans, services, products, clubEnabled };
}

// ---------------------------------------------------------------------------
// createPlan
// ---------------------------------------------------------------------------

export async function createPlan(input: CreatePlanInput) {
  const { barbershopId } = await requireRole(["owner"]);
  await requireClubEnabled(barbershopId);

  // Validações
  if (!input.name.trim()) return { error: "Nome do plano e obrigatorio." };
  if (input.priceInCents <= 0) return { error: "Preco deve ser maior que zero." };
  if (!input.items.length) return { error: "O plano deve ter ao menos um servico incluido." };

  for (const item of input.items) {
    if (item.quantityPerCycle < 1) return { error: "Quantidade por ciclo deve ser pelo menos 1." };
    if (
      input.barberCommissionMode === "fixed" &&
      (item.barberCommissionInCents == null || item.barberCommissionInCents < 0)
    ) {
      return { error: "Comissao fixa deve ser configurada para todos os servicos no modo fixo." };
    }
  }

  for (const pd of input.productDiscounts) {
    const hasPct = pd.discountPct != null && pd.discountPct > 0;
    const hasCents = pd.discountInCents != null && pd.discountInCents > 0;
    if (!hasPct && !hasCents) return { error: "Desconto de produto deve ter percentual ou valor." };
    if (hasPct && hasCents) return { error: "Desconto de produto deve ter percentual OU valor, nao os dois." };
    if (hasPct && pd.discountPct! > 100) return { error: "Percentual de desconto nao pode exceder 100%." };
  }

  await db.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.create({
      data: {
        barbershopId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceInCents: input.priceInCents,
        barberCommissionMode: input.barberCommissionMode,
        maxSlots: input.maxSlots || null,
        isActive: true,
      },
    });

    if (input.items.length) {
      await tx.subscriptionPlanItem.createMany({
        data: input.items.map((item) => ({
          planId: plan.id,
          serviceId: item.serviceId,
          quantityPerCycle: item.quantityPerCycle,
          barberCommissionInCents:
            input.barberCommissionMode === "fixed"
              ? (item.barberCommissionInCents ?? null)
              : null,
        })),
      });
    }

    if (input.productDiscounts.length) {
      await tx.subscriptionPlanProductDiscount.createMany({
        data: input.productDiscounts.map((pd) => ({
          planId: plan.id,
          productId: pd.productId,
          discountPct: pd.discountPct ?? null,
          discountInCents: pd.discountInCents ?? null,
        })),
      });
    }
  });

  revalidatePath("/dashboard/clube");
  return { success: true };
}

// ---------------------------------------------------------------------------
// updatePlan — substitui items e productDiscounts por completo (delete+insert)
// ---------------------------------------------------------------------------

export async function updatePlan(input: UpdatePlanInput) {
  const { barbershopId } = await requireRole(["owner"]);
  await requireClubEnabled(barbershopId);

  if (!input.name.trim()) return { error: "Nome do plano e obrigatorio." };
  if (input.priceInCents <= 0) return { error: "Preco deve ser maior que zero." };
  if (!input.items.length) return { error: "O plano deve ter ao menos um servico incluido." };

  for (const item of input.items) {
    if (item.quantityPerCycle < 1) return { error: "Quantidade por ciclo deve ser pelo menos 1." };
    if (
      input.barberCommissionMode === "fixed" &&
      (item.barberCommissionInCents == null || item.barberCommissionInCents < 0)
    ) {
      return { error: "Comissao fixa deve ser configurada para todos os servicos no modo fixo." };
    }
  }

  for (const pd of input.productDiscounts) {
    const hasPct = pd.discountPct != null && pd.discountPct > 0;
    const hasCents = pd.discountInCents != null && pd.discountInCents > 0;
    if (!hasPct && !hasCents) return { error: "Desconto de produto deve ter percentual ou valor." };
    if (hasPct && hasCents) return { error: "Desconto de produto deve ter percentual OU valor, nao os dois." };
    if (hasPct && pd.discountPct! > 100) return { error: "Percentual de desconto nao pode exceder 100%." };
  }

  // Verificar ownership
  const existing = await db.subscriptionPlan.findFirst({
    where: { id: input.planId, barbershopId },
  });
  if (!existing) return { error: "Plano nao encontrado." };

  await db.$transaction(async (tx) => {
    await tx.subscriptionPlan.update({
      where: { id: input.planId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        priceInCents: input.priceInCents,
        barberCommissionMode: input.barberCommissionMode,
        maxSlots: input.maxSlots || null,
      },
    });

    // Substituição completa de items
    await tx.subscriptionPlanItem.deleteMany({ where: { planId: input.planId } });
    if (input.items.length) {
      await tx.subscriptionPlanItem.createMany({
        data: input.items.map((item) => ({
          planId: input.planId,
          serviceId: item.serviceId,
          quantityPerCycle: item.quantityPerCycle,
          barberCommissionInCents:
            input.barberCommissionMode === "fixed"
              ? (item.barberCommissionInCents ?? null)
              : null,
        })),
      });
    }

    // Substituição completa de descontos
    await tx.subscriptionPlanProductDiscount.deleteMany({ where: { planId: input.planId } });
    if (input.productDiscounts.length) {
      await tx.subscriptionPlanProductDiscount.createMany({
        data: input.productDiscounts.map((pd) => ({
          planId: input.planId,
          productId: pd.productId,
          discountPct: pd.discountPct ?? null,
          discountInCents: pd.discountInCents ?? null,
        })),
      });
    }
  });

  revalidatePath("/dashboard/clube");
  return { success: true };
}

// ---------------------------------------------------------------------------
// togglePlanActive
// ---------------------------------------------------------------------------

export async function togglePlanActive(planId: string) {
  const { barbershopId } = await requireRole(["owner"]);
  await requireClubEnabled(barbershopId);

  const plan = await db.subscriptionPlan.findFirst({
    where: { id: planId, barbershopId },
  });
  if (!plan) return { error: "Plano nao encontrado." };

  await db.subscriptionPlan.update({
    where: { id: planId },
    data: { isActive: !plan.isActive },
  });

  revalidatePath("/dashboard/clube");
  return { success: true };
}

// ---------------------------------------------------------------------------
// connectClubAccount
// ---------------------------------------------------------------------------

export type ConnectClubAccountInput = {
  cnpj: string;
  mobilePhone: string;
};

export async function connectClubAccount(input: ConnectClubAccountInput) {
  const { barbershopId } = await requireRole(["owner"]);

  const cnpjDigits = input.cnpj.replace(/\D/g, "");
  if (!validarCNPJ(cnpjDigits)) {
    return { error: "CNPJ invalido. Verifique os digitos e tente novamente." };
  }

  const phoneDigits = input.mobilePhone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return { error: "Telefone invalido." };
  }

  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { clubAsaasWalletId: true, name: true },
  });

  if (!barbershop) return { error: "Barbearia nao encontrada." };
  if (barbershop.clubAsaasWalletId) {
    return { error: "Conta de pagamento ja conectada." };
  }

  const ownerMembership = await db.membership.findFirst({
    where: { barbershopId, role: "owner" },
    include: { user: { select: { email: true } } },
  });
  const ownerEmail = ownerMembership?.user?.email ?? "";

  const subaccountResult = await createAsaasSubaccount({
    name: barbershop.name,
    email: ownerEmail,
    cnpj: cnpjDigits,
    mobilePhone: phoneDigits,
  });

  if (!subaccountResult.success) {
    return { error: subaccountResult.error };
  }

  await db.barbershop.update({
    where: { id: barbershopId },
    data: {
      clubAsaasWalletId: subaccountResult.walletId,
      clubAsaasAccountStatus: subaccountResult.accountStatus,
    },
  });

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://livobarber.com.br";
  const webhookResult = await configureClubWebhook(
    subaccountResult.walletId,
    appBaseUrl
  );

  if (!webhookResult.success) {
    console.error("[connectClubAccount] webhook config falhou:", webhookResult.error);
  }

  revalidatePath("/dashboard/clube");
  return { success: true, accountStatus: subaccountResult.accountStatus };
}

// ---------------------------------------------------------------------------
// getAssinantes — leitura para o dashboard de assinantes
// ---------------------------------------------------------------------------

export async function getAssinantes() {
  const { barbershopId } = await requireRole(["owner", "reception"]);
  await requireClubEnabled(barbershopId);

  const now = new Date();
  const periodStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1
  ));
  const periodEnd = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
    23, 59, 59, 999
  ));

  const subscriptions = await db.clientSubscription.findMany({
    where: { barbershopId },
    include: {
      client: { select: { name: true, phone: true } },
      plan: { select: { name: true, priceInCents: true, items: {
        select: { serviceId: true, quantityPerCycle: true }
      }}},
      usages: {
        where: {
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
        select: { serviceId: true, usedCount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Buscar nomes dos profissionais que venderam
  const professionalIds = subscriptions
    .map((s) => s.soldByProfessionalId)
    .filter((id): id is string => !!id);

  const professionals =
    professionalIds.length > 0
      ? await db.professional.findMany({
          where: { id: { in: professionalIds } },
          select: { id: true, name: true },
        })
      : [];

  const profMap = new Map(professionals.map((p) => [p.id, p.name]));

  // MRR = soma dos planos com status active
  const mrr = subscriptions
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + s.plan.priceInCents, 0);

  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const cancelledCount = subscriptions.filter((s) => s.status === "cancelled").length;

  return {
    subscriptions: subscriptions.map((s) => ({
      ...s,
      soldByName: s.soldByProfessionalId
        ? (profMap.get(s.soldByProfessionalId) ?? "Desconhecido")
        : null,
      periodStart,
      periodEnd,
    })),
    mrr,
    activeCount,
    cancelledCount,
  };
}
