"use server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireModuleAccess } from "@/lib/modules";
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

  const targetProfessional = await db.professional.findFirst({
    where: { id: professionalId, barbershopId: membership.barbershopId },
  });
  if (!targetProfessional) throw new Error("Profissional não encontrado.");

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

  // Pré-carregar overrides (sem N+1 no loop)
  const [svcComms, prodComms] = await Promise.all([
    db.professionalServiceCommission.findMany({
      where: { professionalId },
      select: { serviceId: true, commissionPct: true },
    }),
    db.professionalProductCommission.findMany({
      where: { professionalId },
      select: { productId: true, commissionPct: true },
    }),
  ]);
  const serviceOverrides = new Map(
    svcComms.map((c) => [c.serviceId, Number(c.commissionPct)]),
  );
  const productOverrides = new Map(
    prodComms.map((c) => [c.productId, Number(c.commissionPct)]),
  );

  let atualizados = 0;

  await db.$transaction(async (tx) => {
    for (const item of itemsParaRecalcular) {
      let pct: number | null = null;
      let value: number | null = null;

      if (item.type === "service") {
        const override = item.serviceId ? serviceOverrides.get(item.serviceId) : undefined;
        if (override !== undefined) {
          pct = override;
          value = Math.round((item.totalInCents * pct) / 100);
        } else if (
          targetProfessional.commissionOnServices &&
          targetProfessional.commissionServicePct !== null
        ) {
          pct = Number(targetProfessional.commissionServicePct);
          value = Math.round((item.totalInCents * pct) / 100);
        }
      } else if (item.type === "product") {
        const override = item.productId ? productOverrides.get(item.productId) : undefined;
        if (override !== undefined) {
          pct = override;
          value = Math.round((item.totalInCents * pct) / 100);
        } else if (
          targetProfessional.commissionOnProducts &&
          targetProfessional.commissionProductPct !== null
        ) {
          pct = Number(targetProfessional.commissionProductPct);
          value = Math.round((item.totalInCents * pct) / 100);
        }
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

// ─── BUSCAR OVERRIDES POR ITEM ────────────────────────────────────────────────
// Retorna todos os serviços/produtos ativos da barbearia, com override se existir.

export async function getProfessionalItemCommissions(professionalId: string): Promise<{
  services: { id: string; name: string; override: number | null }[];
  products: { id: string; name: string; override: number | null }[];
}> {
  const membership = await requireRole("owner");

  const [services, products, svcComms, prodComms] = await Promise.all([
    db.service.findMany({
      where: { barbershopId: membership.barbershopId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { barbershopId: membership.barbershopId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.professionalServiceCommission.findMany({
      where: {
        professionalId,
        professional: { barbershopId: membership.barbershopId },
      },
      select: { serviceId: true, commissionPct: true },
    }),
    db.professionalProductCommission.findMany({
      where: {
        professionalId,
        professional: { barbershopId: membership.barbershopId },
      },
      select: { productId: true, commissionPct: true },
    }),
  ]);

  const svcMap = new Map(svcComms.map((c) => [c.serviceId, Number(c.commissionPct)]));
  const prodMap = new Map(prodComms.map((c) => [c.productId, Number(c.commissionPct)]));

  return {
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      override: svcMap.get(s.id) ?? null,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      override: prodMap.get(p.id) ?? null,
    })),
  };
}

// ─── SALVAR OVERRIDES POR ITEM ────────────────────────────────────────────────
// Upsert/delete overrides individuais. commissionPct null ou ≤ 0 = apagar override
// (volta para o percentual fixo do Professional).

export async function updateProfessionalItemCommissions(
  professionalId: string,
  overrides: { type: "service" | "product"; itemId: string; commissionPct: number | null }[],
): Promise<void> {
  const membership = await requireRole("owner");
  // Gate de módulo (endpoint de escrita): hard-stop via throw, padrão do clube.
  await requireModuleAccess(membership.barbershopId, "comissoes");

  const prof = await db.professional.findFirst({
    where: { id: professionalId, barbershopId: membership.barbershopId },
    select: { id: true },
  });
  if (!prof) throw new Error("Profissional não encontrado.");

  await db.$transaction(async (tx) => {
    for (const override of overrides) {
      if (override.type === "service") {
        if (!override.commissionPct || override.commissionPct <= 0) {
          await tx.professionalServiceCommission.deleteMany({
            where: { professionalId, serviceId: override.itemId },
          });
        } else {
          await tx.professionalServiceCommission.upsert({
            where: {
              professionalId_serviceId: {
                professionalId,
                serviceId: override.itemId,
              },
            },
            create: {
              professionalId,
              serviceId: override.itemId,
              commissionPct: override.commissionPct,
            },
            update: { commissionPct: override.commissionPct },
          });
        }
      } else {
        if (!override.commissionPct || override.commissionPct <= 0) {
          await tx.professionalProductCommission.deleteMany({
            where: { professionalId, productId: override.itemId },
          });
        } else {
          await tx.professionalProductCommission.upsert({
            where: {
              professionalId_productId: {
                professionalId,
                productId: override.itemId,
              },
            },
            create: {
              professionalId,
              productId: override.itemId,
              commissionPct: override.commissionPct,
            },
            update: { commissionPct: override.commissionPct },
          });
        }
      }
    }
  });

  await recalcularComissoesPendentes(professionalId);
}
