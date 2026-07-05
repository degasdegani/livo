// src/app/(dashboard)/dashboard/assinar/actions.ts
"use server";

import { MemberRole, PlanStatus } from "@prisma/client";
import { getCurrentMembership } from "@/lib/permissions";
import { isEmailGateBlocked } from "@/lib/email-gate";
import {
  cancelAsaasSubscription,
  createAsaasCustomer,
  createAsaasSubscription,
  getChargePixQrCode,
  getSubscriptionPayments,
} from "@/lib/asaas";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { PLAN_PRICING } from "@/lib/plans";

export interface SubscriptionResult {
  success?: boolean;
  error?: string;
  invoiceUrl?: string;
  pixPayload?: string;
  pixImage?: string;
  billingType?: "monthly" | "yearly";
}

export async function createSubscription(
  _prevState: SubscriptionResult | null,
  formData: FormData,
): Promise<SubscriptionResult> {
  try {
    const membership = await getCurrentMembership();
    if (!membership) return { error: "Não autenticado." };
    if (membership.role !== MemberRole.owner) return { error: "Sem permissão." };

    const cpfCnpj = formData.get("cpfCnpj") as string;
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, "").length < 11) {
      return { error: "CPF inválido. Digite um CPF válido." };
    }

    // Plano escolhido — validação server-side (whitelist), nunca confiar cru.
    // Default "pro" preserva o histórico da tela (que vendia só PRO).
    const plan = (formData.get("plan") as string) === "start" ? "start" : "pro";

    // START não tem plano anual: coage para mensal.
    let billingType =
      (formData.get("billingType") as "monthly" | "yearly") ?? "monthly";
    if (plan === "start") billingType = "monthly";

    const barbershop = await db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      include: { owner: true },
    });

    if (!barbershop) return { error: "Barbearia não encontrada." };

    if (barbershop.planStatus === PlanStatus.active) {
      return { error: "Você já tem uma assinatura ativa." };
    }

    if (barbershop.planStatus === PlanStatus.lifetime) {
      return { error: "Sua conta tem acesso vitalício." };
    }

    // Suspenso = inadimplência em assinatura existente. Criar nova assinatura
    // sobrescreveria asaasSubscriptionId e quebraria o roteamento do webhook,
    // impedindo a reativação automática via PAYMENT_CONFIRMED do débito pendente.
    if (barbershop.planStatus === PlanStatus.suspended) {
      return {
        error:
          "Assinatura suspensa por inadimplência. Pague a fatura pendente para reativar o acesso automaticamente.",
      };
    }

    // Portão suave de confirmação de e-mail (B1.3): bloqueia o INÍCIO da
    // cobrança até o dono confirmar o e-mail. lifetime já retornou acima;
    // Google entra confirmado (events.createUser). owner já veio no include.
    if (
      isEmailGateBlocked({
        planStatus: barbershop.planStatus,
        emailVerified: barbershop.owner.emailVerified,
      })
    ) {
      return {
        error:
          "Confirme seu e-mail antes de assinar. Acesse /verify-email para reenviar a confirmação.",
      };
    }

    log.billing.info("iniciando criação de assinatura", {
      userId: membership.userId,
      barbershopId: membership.barbershopId,
      billingType,
      planStatus: barbershop.planStatus,
    });

    let customerId = barbershop.asaasCustomerId;

    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: barbershop.owner.name || barbershop.name,
        email: barbershop.owner.email!,
        cpfCnpj: cpfCnpj,
        phone: barbershop.phone || undefined,
      });
      customerId = customer.id;
      await db.barbershop.update({
        where: { id: barbershop.id },
        data: { asaasCustomerId: customerId },
      });
      log.billing.info("cliente Asaas criado", {
        barbershopId: barbershop.id,
        asaasCustomerId: customerId,
      });
    }

    const now = new Date();
    let nextDueDate: string;
    if (barbershop.trialEndsAt && barbershop.trialEndsAt > now) {
      nextDueDate = barbershop.trialEndsAt.toISOString().split("T")[0];
    } else {
      const due = new Date();
      due.setDate(due.getDate() + 3);
      nextDueDate = due.toISOString().split("T")[0];
    }

    // Preço fixo do Programa Embaixadores: customMonthlyPriceInCents (setado
    // manualmente na conta, em CENTAVOS inteiros) sobrepõe o preço da tabela.
    // É imune a mudanças futuras no preço padrão do PRO — o valor da assinatura
    // Asaas é fixado na criação e nunca reescrito. O embaixador NÃO tem opção
    // anual: força billingType="monthly", ignorando "yearly" do formulário
    // (assim cycle/cycleLabel/billingType retornado ficam todos mensais).
    const overridePriceInCents = barbershop.customMonthlyPriceInCents;
    if (overridePriceInCents != null) billingType = "monthly";

    // Conversão de unidade: customMonthlyPriceInCents é centavos inteiros
    // (ex.: 9990) e PLAN_PRICING é reais decimais (ex.: 169.9) → centavos / 100.
    // START coagido para monthly acima → PLAN_PRICING[plan][billingType] nunca null.
    const value =
      overridePriceInCents != null
        ? overridePriceInCents / 100
        : (PLAN_PRICING[plan][billingType] ?? PLAN_PRICING[plan].monthly);
    const cycle = billingType === "yearly" ? "YEARLY" : "MONTHLY";
    const cycleLabel = billingType === "yearly" ? "Anual" : "Mensal";

    const subscription = await createAsaasSubscription({
      customerId,
      value,
      nextDueDate,
      cycle,
      description: `LIVO ${plan.toUpperCase()} ${cycleLabel} — ${barbershop.name}`,
    });

    // NÃO ativa aqui. O acesso só é liberado quando o webhook receber
    // PAYMENT_CONFIRMED/PAYMENT_RECEIVED.
    // Compare-and-swap (P1-B): só grava se asaasSubscriptionId continuar com o
    // valor lido no início. Cobre trial (null) e re-assinatura de cancelled
    // (ID stale). Se outro request concorrente venceu a corrida entre o read e
    // este write, count === 0 → a subscription que acabamos de criar no Asaas é
    // órfã e precisa ser cancelada para não gerar cobrança sem rastro no LIVO.
    // Grava o plano no momento da CRIAÇÃO da assinatura (não no webhook, que só
    // ativa planStatus). Desde a E1 nada mais escreve `plan`; sem isto a conta
    // ficaria presa em "start" mesmo pagando PRO, e o gate de módulo (E3) a
    // bloquearia. Hoje só vendemos PRO; a Parte 2 passará o plano escolhido.
    const claimed = await db.barbershop.updateMany({
      where: {
        id: barbershop.id,
        asaasSubscriptionId: barbershop.asaasSubscriptionId,
      },
      data: { asaasSubscriptionId: subscription.id, plan },
    });

    if (claimed.count === 0) {
      await cancelAsaasSubscription(subscription.id);
      log.billing.warn("assinatura concorrente cancelada (race P1-B)", {
        barbershopId: barbershop.id,
        orphanSubscriptionId: subscription.id,
      });
      return {
        error:
          "Assinatura já em processamento. Recarregue a página e tente novamente.",
      };
    }

    log.billing.info("assinatura Asaas criada", {
      barbershopId: barbershop.id,
      subscriptionId: subscription.id,
      billingType,
      nextDueDate,
    });

    const payments = await getSubscriptionPayments(subscription.id);
    const firstPayment = payments.data[0];

    if (!firstPayment) {
      return { success: true, billingType };
    }

    try {
      const pix = await getChargePixQrCode(firstPayment.id);
      return {
        success: true,
        billingType,
        invoiceUrl: firstPayment.invoiceUrl,
        pixPayload: pix.payload,
        pixImage: pix.encodedImage,
      };
    } catch {
      return {
        success: true,
        billingType,
        invoiceUrl: firstPayment.invoiceUrl,
      };
    }
  } catch (err) {
    log.billing.error("erro ao criar assinatura", {}, err);
    return {
      error: "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    };
  }
}
