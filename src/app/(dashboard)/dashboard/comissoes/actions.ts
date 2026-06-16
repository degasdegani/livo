"use server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireRole } from "@/lib/permissions";
import { getComissoesData as _getComissoesData } from "../comandas/actions";

export async function getComissoesData(
  periodo:
    | "mes_atual"
    | "mes_anterior"
    | "ultimos_30"
    | "ultimos_90" = "mes_atual",
  professionalId?: string,
) {
  return _getComissoesData(periodo, professionalId);
}

// ─── RECALCULAR COMISSÕES PENDENTES ──────────────────────────────────────────
// Recalcula commissionValue de ComandaItems de comandas já fechadas que ainda
// estão com commissionValue null (nunca calculados, ou calculados quando a
// comissão do profissional estava desligada/sem percentual definido).
// Itens que já têm commissionValue preenchido NUNCA são alterados — preserva
// histórico de comissões já contabilizadas com um percentual anterior.

export async function recalcularComissoesPendentes(
  professionalId: string,
): Promise<{ atualizados: number }> {
  const membership = await requireRole("owner");

  const targetMembership = await db.membership.findFirst({
    where: { professionalId, barbershopId: membership.barbershopId },
  });
  if (!targetMembership) throw new Error("Profissional não encontrado.");

  const itemsParaRecalcular = await db.comandaItem.findMany({
    where: {
      commissionValue: null,
      comanda: {
        barbershopId: membership.barbershopId,
        professionalId,
        status: "closed",
      },
    },
  });

  let atualizados = 0;

  await db.$transaction(async (tx) => {
    for (const item of itemsParaRecalcular) {
      let pct: number | null = null;
      let value: number | null = null;

      if (
        item.type === "service" &&
        targetMembership.commissionOnServices &&
        targetMembership.commissionServicePct !== null
      ) {
        pct = Number(targetMembership.commissionServicePct);
        value = Math.round((item.totalInCents * pct) / 100);
      } else if (
        item.type === "product" &&
        targetMembership.commissionOnProducts &&
        targetMembership.commissionProductPct !== null
      ) {
        pct = Number(targetMembership.commissionProductPct);
        value = Math.round((item.totalInCents * pct) / 100);
      }

      if (value !== null) {
        await tx.comandaItem.update({
          where: { id: item.id },
          data: { commissionPct: pct, commissionValue: value },
        });
        atualizados++;
      }
    }
  });

  log.comanda.info("comissoes recalculadas retroativamente", {
    barbershopId: membership.barbershopId,
    professionalId,
    atualizados,
  });

  return { atualizados };
}
