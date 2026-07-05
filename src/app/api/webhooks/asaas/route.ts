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

    // Timestamp do evento no nível RAIZ do payload (dateCreated). Presente em
    // TODOS os 7 tipos de evento — inclusive SUBSCRIPTION_DELETED, que não tem
    // objeto `payment`. É a única fonte universal de ordem; por isso NÃO usamos
    // o fallback payment.confirmedDate/dueDate do handler do clube (colapsaria
    // para now() no SUBSCRIPTION_DELETED). Guarda P1-A/VS-5: cada updateMany só
    // aplica se este evento for mais recente que o último já processado.
    const eventAt = body.dateCreated ? new Date(body.dateCreated) : new Date();
    const isNewerEvent = {
      OR: [
        { lastBillingEventAt: null },
        { lastBillingEventAt: { lt: eventAt } },
      ],
    };

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
            ...isNewerEvent,
          },
          data: {
            planStatus: PlanStatus.active,
            // NÃO forçar `plan` aqui: o plano correto (start/pro) já foi
            // gravado na criação da assinatura, quando o plano escolhido é
            // conhecido. Sobrescrever com "pro" quebraria um START pago.
            // O webhook só ativa o status; o guard de ordering
            // (lastBillingEventAt via isNewerEvent) permanece intacto.
            lastBillingEventAt: eventAt,
          },
        });
        log.billing.info("assinatura ativada por pagamento", {
          correlationId,
          event,
          subscriptionId: payment.subscription,
          paymentId: payment.id,
        });

        // ── A3 (Programa Embaixadores) — crédito de mês grátis ao indicador ──
        // Operação INDEPENDENTE do guard de ordering C1 acima. Detecta a PRIMEIRA
        // mensalidade paga de verdade e, se a conta foi indicada, credita 1 mês
        // grátis (interno, Fase 1 — aplicação manual depois, sem automação Asaas).
        // Idempotência própria via CAS `firstPaymentConfirmedAt: null`: reentregas
        // do Asaas e confirmações recorrentes seguintes não creditam de novo
        // (mesmo padrão de C2/P1-B e do markPackagePaid de Pacotes). Guard
        // `planStatus != lifetime` mantém a TX Barbearia 100% intocada.
        const firstPaid = await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
            firstPaymentConfirmedAt: null,
          },
          data: { firstPaymentConfirmedAt: eventAt },
        });
        if (firstPaid.count > 0) {
          const shop = await db.barbershop.findFirst({
            where: { asaasSubscriptionId: payment.subscription },
            select: { id: true, referredByBarbershopId: true },
          });
          if (shop?.referredByBarbershopId) {
            await db.barbershop.update({
              where: { id: shop.referredByBarbershopId },
              data: { freeMonthCredits: { increment: 1 } },
            });
            log.billing.info("credito de mes gratis concedido ao indicador", {
              correlationId,
              event,
              subscriptionId: payment.subscription,
              paidBarbershopId: shop.id,
              referrerBarbershopId: shop.referredByBarbershopId,
            });
          }
        }
      }
    }

    // ── Pagamento atrasado → suspende o acesso ─────────────────
    if (event === "PAYMENT_OVERDUE") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
            ...isNewerEvent,
          },
          data: {
            planStatus: PlanStatus.suspended,
            lastBillingEventAt: eventAt,
          },
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
            ...isNewerEvent,
          },
          data: {
            planStatus: PlanStatus.cancelled,
            lastBillingEventAt: eventAt,
          },
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
            ...isNewerEvent,
          },
          data: {
            planStatus: PlanStatus.cancelled,
            lastBillingEventAt: eventAt,
          },
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
            ...isNewerEvent,
          },
          data: {
            planStatus: PlanStatus.suspended,
            lastBillingEventAt: eventAt,
          },
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
            ...isNewerEvent,
          },
          data: {
            planStatus: PlanStatus.suspended,
            lastBillingEventAt: eventAt,
          },
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
