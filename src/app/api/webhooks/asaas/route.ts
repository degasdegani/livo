// ============================================================
// LIVO — Webhook Asaas
// Única autoridade que ativa/suspende/cancela o acesso pago.
// ============================================================

// src/app/api/webhooks/asaas/route.ts
import { PlanStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Valida o token enviado pelo Asaas no header asaas-access-token
    const token = req.headers.get("asaas-access-token");
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.error("[webhook] Token inválido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;

    console.log(`[webhook] Evento recebido: ${event}`, payment?.id);

    // ── Pagamento confirmado/recebido → ativa o PRO ────────────
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime }, // protege a TX
          },
          data: { planStatus: PlanStatus.active, plan: "pro" },
        });
        console.log(`[webhook] PRO ativado: ${payment.subscription}`);
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
        console.log(`[webhook] Plano suspenso: ${payment.subscription}`);
      }
    }

    // ── Cobrança removida (assinatura cancelada) → cancela ─────
    if (event === "PAYMENT_DELETED") {
      if (payment?.subscription) {
        await db.barbershop.updateMany({
          where: {
            asaasSubscriptionId: payment.subscription,
            planStatus: { not: PlanStatus.lifetime },
          },
          data: { planStatus: PlanStatus.cancelled },
        });
        console.log(`[webhook] Assinatura cancelada: ${payment.subscription}`);
      }
    }

    // Sempre 200 para o Asaas não penalizar a fila
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Erro:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
