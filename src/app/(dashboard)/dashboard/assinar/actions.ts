"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getSubscriptionPayments,
  getChargePixQrCode,
} from "@/lib/asaas";
import { redirect } from "next/navigation";

const PLAN_PRICES = {
  start: 97.0,
  pro: 197.0,
  prime: 297.0,
};

export interface SubscriptionResult {
  success?: boolean;
  error?: string;
  invoiceUrl?: string;
  pixPayload?: string;
  pixImage?: string;
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

    const barbershop = await db.barbershop.findUnique({
      where: { ownerId: session.user.id },
      include: { owner: true },
    });
    if (!barbershop) return { error: "Barbearia não encontrada." };

    // Já tem assinatura ativa
    if (barbershop.planStatus === "active") {
      return { error: "Você já tem uma assinatura ativa." };
    }

    let customerId = barbershop.asaasCustomerId;

    // Cria cliente no Asaas se ainda não existe
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

    // Data de vencimento: trial restante ou amanhã
    const now = new Date();
    let nextDueDate: string;

    if (barbershop.trialEndsAt && barbershop.trialEndsAt > now) {
      // Ainda está no trial → primeira cobrança no fim do trial
      nextDueDate = barbershop.trialEndsAt.toISOString().split("T")[0];
    } else {
      // Trial vencido → cobra em 3 dias (tempo para pagar)
      const due = new Date();
      due.setDate(due.getDate() + 3);
      nextDueDate = due.toISOString().split("T")[0];
    }

    // Cria assinatura
    const subscription = await createAsaasSubscription({
      customerId: customerId,
      value: PLAN_PRICES[barbershop.plan as keyof typeof PLAN_PRICES] || 97.0,
      nextDueDate,
      description: `Livo ${barbershop.plan.charAt(0).toUpperCase() + barbershop.plan.slice(1)} — ${barbershop.name}`,
    });

    // Salva o ID da assinatura
    await db.barbershop.update({
      where: { id: barbershop.id },
      data: {
        asaasSubscriptionId: subscription.id,
        planStatus: "active", // ativa preventivamente (webhook confirma depois)
      },
    });

    // Busca o primeiro pagamento para pegar o link/PIX
    const payments = await getSubscriptionPayments(subscription.id);
    const firstPayment = payments.data[0];

    if (!firstPayment) {
      return { success: true };
    }

    // Tenta pegar o QR Code PIX
    try {
      const pix = await getChargePixQrCode(firstPayment.id);
      return {
        success: true,
        invoiceUrl: firstPayment.invoiceUrl,
        pixPayload: pix.payload,
        pixImage: pix.encodedImage,
      };
    } catch {
      return {
        success: true,
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
