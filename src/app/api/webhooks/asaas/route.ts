// ============================================================
// LIVO — Webhook Asaas
// Única autoridade que ativa/suspende/cancela o acesso pago.
// ============================================================
// src/app/api/webhooks/asaas/route.ts
import { PlanStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get("x-correlation-id") ?? undefined;

  try {
    const token = req.headers.get("asaas-access-token");
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      log.webhook.warn("token inválido recebido", { correlationId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment, subscription } = body;

    log.webhook.info("evento recebido", {
      correlationId,
      event,
      paymentId: payment?.id,
      subscriptionId: subscription?.id ?? payment?.subscription,
    });

    // ── Pagamento confirmado/recebido → ativa o PRO ────────────
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.active, plan: "pro" },
        });
        log.billing.info("plano PRO ativado por pagamento", {
          correlationId,
          event,
          subscriptionId: payment.subscription,
          paymentId: payment.id,
        });
      }
    }

    // ── Pagamento atrasado → suspende o acesso ─────────────────
    if (event === "PAYMENT_OVERDUE") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.suspended },
        });
        log.billing.warn("plano suspenso por inadimplência", {
          correlationId,
          subscriptionId: payment.subscription,
          paymentId: payment.id,
        });
      }
    }

    // ── Cobrança removida (pagamento deletado) → cancela ───────
    if (event === "PAYMENT_DELETED") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.cancelled },
        });
        log.billing.warn("plano cancelado por remoção de pagamento", {
          correlationId,
          subscriptionId: payment.subscription,
          paymentId: payment.id,
        });
      }
    }

    // ── Assinatura removida no Asaas → cancela o acesso ────────
    if (event === "SUBSCRIPTION_DELETED") {
      const subscriptionId = subscription?.id;
      if (subscriptionId) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: subscriptionId,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.cancelled },
        });
        log.billing.warn("plano cancelado por exclusão de assinatura", {
          correlationId,
          subscriptionId,
        });
      }
    }

    // ── Pagamento estornado → suspende acesso imediatamente ────
    // Suspensão (não cancelamento) — a assinatura pode ser reativada se o
    // estorno for revertido ou um novo pagamento for confirmado.
    if (event === "PAYMENT_REFUNDED") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.suspended },
        });
        log.billing.warn("plano suspenso por estorno de pagamento", {
          correlationId,
          subscriptionId: payment.subscription,
          paymentId: payment.id,
        });
      }
    }

    // ── Chargeback solicitado → suspensão cautelar imediata ────
    // Suspensão cautelar: disputa bancária ainda em andamento.
    // Se o chargeback for rejeitado e PAYMENT_CONFIRMED chegar,
    // o plano é reativado automaticamente pelo handler existente.
    if (event === "PAYMENT_CHARGEBACK_REQUESTED") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.suspended },
        });
        log.billing.warn("plano suspenso por chargeback solicitado", {
          correlationId,
          subscriptionId: payment.subscription,
          paymentId: payment.id,
        });
      }
    }

    // Sempre 200 para o Asaas não penalizar a fila
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.webhook.error("erro ao processar evento Asaas", { correlationId }, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
