// ============================================================
// LIVO — Webhook Asaas
// Recebe notificações de pagamento e atualiza o plano
// ============================================================

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Verifica o token de autenticação do webhook
    const token = req.headers.get("asaas-access-token");
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.error("[webhook] Token inválido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;

    console.log(`[webhook] Evento recebido: ${event}`, payment?.id);

    // ── Pagamento confirmado → ativa o plano ───────────────
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!payment?.subscription) {
        return NextResponse.json({ ok: true });
      }

      await db.barbershop.updateMany({
        where: { asaasSubscriptionId: payment.subscription },
        data: { planStatus: "active" },
      });

      console.log(
        `[webhook] Plano ativado para subscription: ${payment.subscription}`,
      );
    }

    // ── Pagamento atrasado → suspende ─────────────────────
    if (event === "PAYMENT_OVERDUE") {
      if (!payment?.subscription) {
        return NextResponse.json({ ok: true });
      }

      await db.barbershop.updateMany({
        where: { asaasSubscriptionId: payment.subscription },
        data: { planStatus: "suspended" },
      });

      console.log(
        `[webhook] Plano suspenso para subscription: ${payment.subscription}`,
      );
    }

    // ── Assinatura cancelada ───────────────────────────────
    if (event === "SUBSCRIPTION_DELETED") {
      const subscriptionId = body.subscription?.id;
      if (!subscriptionId) {
        return NextResponse.json({ ok: true });
      }

      await db.barbershop.updateMany({
        where: { asaasSubscriptionId: subscriptionId },
        data: { planStatus: "cancelled" },
      });

      console.log(`[webhook] Assinatura cancelada: ${subscriptionId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Erro:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
