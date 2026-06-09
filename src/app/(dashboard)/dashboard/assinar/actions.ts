// src/app/(dashboard)/dashboard/assinar/actions.ts
"use server";

import { PlanStatus } from "@prisma/client";
import { auth } from "@/auth";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getChargePixQrCode,
  getSubscriptionPayments,
} from "@/lib/asaas";
import { db } from "@/lib/db";

const PLAN_PRICES = {
  monthly: 197.0,
  yearly: 1997.0,
};

export interface SubscriptionResult {
  success?: boolean;
  error?: string;
  invoiceUrl?: string;
  pixPayload?: string;
  pixImage?: string;
  billingType?: "monthly" | "yearly";
}

export async function createSubscription(
  prevState: SubscriptionResult | null,
  formData: FormData,
): Promise<SubscriptionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Não autenticado." };

    const cpfCnpj = formData.get("cpfCnpj") as string;
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, "").length < 11) {
      return { error: "CPF inválido. Digite um CPF válido." };
    }

    const billingType =
      (formData.get("billingType") as "monthly" | "yearly") ?? "monthly";

    const barbershop = await db.barbershop.findUnique({
      where: { ownerId: session.user.id },
      include: { owner: true },
    });

    if (!barbershop) return { error: "Barbearia não encontrada." };

    if (barbershop.planStatus === PlanStatus.active) {
      return { error: "Você já tem uma assinatura ativa." };
    }

    if (barbershop.planStatus === PlanStatus.lifetime) {
      return { error: "Sua conta tem acesso vitalício." };
    }

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

    const value = PLAN_PRICES[billingType];
    const cycle = billingType === "yearly" ? "YEARLY" : "MONTHLY";
    const cycleLabel = billingType === "yearly" ? "Anual" : "Mensal";

    const subscription = await createAsaasSubscription({
      customerId,
      value,
      nextDueDate,
      cycle,
      description: `LIVO PRO ${cycleLabel} — ${barbershop.name}`,
    });

    // NÃO ativa aqui. O acesso só é liberado quando o webhook receber
    // PAYMENT_CONFIRMED/PAYMENT_RECEIVED. Aqui apenas guardamos a assinatura.
    await db.barbershop.update({
      where: { id: barbershop.id },
      data: { asaasSubscriptionId: subscription.id },
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
    console.error("[createSubscription]", err);
    return {
      error: "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    };
  }
}
