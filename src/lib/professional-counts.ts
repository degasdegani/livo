// ============================================================
// LIVO — Contagem de itens realizados por profissional
// Read-side puro (sem migration). Soma ComandaItem.quantity de
// comandas FECHADAS no mes corrente, escopado por barbearia +
// profissional. Padrao de soma por quantity inspirado em
// tv/api/data/route.ts (contagem de servicos do ranking).
// ============================================================

import { ComandaStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type ProfessionalMonthlyCounts = {
  servicosCount: number;
  produtosCount: number;
};

// Limites do mes corrente via Date.UTC (inicio inclusivo, proximo mes
// exclusivo). reference permite testar/forcar outra data se necessario.
export async function getProfessionalMonthlyCounts(
  barbershopId: string,
  professionalId: string,
  reference: Date = new Date(),
): Promise<ProfessionalMonthlyCounts> {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  const items = await db.comandaItem.findMany({
    where: {
      comanda: {
        barbershopId,
        professionalId,
        status: ComandaStatus.closed,
        closedAt: { gte: monthStart, lt: nextMonthStart },
      },
    },
    select: { type: true, quantity: true },
  });

  let servicosCount = 0;
  let produtosCount = 0;
  for (const item of items) {
    if (item.type === "service") {
      servicosCount += item.quantity;
    } else {
      produtosCount += item.quantity;
    }
  }

  return { servicosCount, produtosCount };
}
