import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ClientSubscriptionStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos do payload Asaas
// ---------------------------------------------------------------------------

type AsaasPaymentEvent = {
  event: string;
  payment?: {
    subscription?: string;
    confirmedDate?: string;
    dueDate?: string;
  };
};

// ---------------------------------------------------------------------------
// Mapeamento de eventos → status
// ---------------------------------------------------------------------------

function resolveStatus(event: string): ClientSubscriptionStatus | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return ClientSubscriptionStatus.active;
    case "PAYMENT_OVERDUE":
      return ClientSubscriptionStatus.suspended;
    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED":
      return ClientSubscriptionStatus.cancelled;
    default:
      return null;
  }
}

function isUpgradingEvent(event: string): boolean {
  return event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validar token
  const token = req.headers.get("asaas-access-token");
  if (!token || token !== process.env.ASAAS_CLUBE_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AsaasPaymentEvent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment } = body;
  const asaasSubscriptionId = payment?.subscription;

  // Ignorar eventos sem subscriptionId
  if (!asaasSubscriptionId) {
    return NextResponse.json({ received: true });
  }

  const newStatus = resolveStatus(event);
  if (!newStatus) {
    // Evento não mapeado — ignorar silenciosamente
    return NextResponse.json({ received: true });
  }

  // Timestamp do evento (usar confirmedDate ou dueDate ou agora)
  const eventDateRaw = payment?.confirmedDate ?? payment?.dueDate ?? null;
  const eventAt = eventDateRaw ? new Date(eventDateRaw) : new Date();

  try {
    await db.$transaction(async (tx) => {
      // 2. Buscar assinatura pelo asaasSubscriptionId (unique)
      const subscription = await tx.clientSubscription.findUnique({
        where: { asaasSubscriptionId },
        select: {
          id: true,
          status: true,
          startedAt: true,
          lastBillingEventAt: true,
          currentPeriodEnd: true,
          planId: true,
        },
      });

      if (!subscription) {
        // Assinatura não encontrada — pode ser de outra integração, ignorar
        return;
      }

      // 3. Idempotência: ignorar se o evento não é mais recente (lição P1-A + VS-5)
      if (
        subscription.lastBillingEventAt &&
        !isUpgradingEvent(event) &&
        eventAt <= subscription.lastBillingEventAt
      ) {
        return;
      }

      // Para eventos de upgrade (confirmed/received), sempre processar
      // Para eventos de downgrade (overdue/cancelled), só processar se mais recente

      // 4. Calcular novo currentPeriodEnd se for pagamento confirmado
      let currentPeriodEnd = subscription.currentPeriodEnd;
      if (isUpgradingEvent(event)) {
        // Próximo ciclo = 30 dias a partir de hoje
        currentPeriodEnd = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() + 30
          )
        );
      }

      // 5. Atualizar status
      await tx.clientSubscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus,
          lastBillingEventAt: eventAt,
          startedAt:
            newStatus === ClientSubscriptionStatus.active
              ? (subscription.startedAt ?? new Date()) // não sobrescrever se já tinha
              : undefined,
          currentPeriodEnd,
          ...(newStatus === ClientSubscriptionStatus.cancelled
            ? { cancelledAt: eventAt }
            : {}),
        },
      });
    });
  } catch (err) {
    console.error("[webhook-clube] erro ao processar evento:", event, err);
    // Retornar 200 mesmo em erro interno para o Asaas não retentar indefinidamente
    // O erro está logado para investigação
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
