// ============================================================
// LIVO — Planos: limites de acesso e recursos liberados
// ============================================================

import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// Preços por plano — definidos em @/lib/pricing (módulo client-safe, sem o
// import de Prisma que este arquivo carrega). Re-exportados aqui para o lado
// servidor manter uma importação única a partir de @/lib/plans.
export { PLAN_PRICING } from "@/lib/pricing";

// Quantos acessos (crachás) cada plano permite NO TOTAL, incluindo o dono
export const PLAN_SEAT_LIMITS: Record<Plan, number> = {
  start: 1, // só o dono
  pro: 3, // dono + recepção + barbeiro
  prime: Number.POSITIVE_INFINITY, // ilimitado
};

// Recursos liberados por plano (vai crescer conforme construímos)
export const PLAN_FEATURES = {
  start: {
    products: false,
    commissions: false,
    multipleProfessionals: false,
    whatsappAssistant: false,
  },
  pro: {
    products: true,
    commissions: true,
    multipleProfessionals: true,
    whatsappAssistant: true,
  },
  prime: {
    products: true,
    commissions: true,
    multipleProfessionals: true,
    whatsappAssistant: true,
  },
} as const;

// Confere se a barbearia ainda pode adicionar um novo acesso
export async function canAddMember(barbershopId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const shop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { plan: true, seatLimitOverride: true },
  });

  const limit = !shop
    ? 0
    : shop.seatLimitOverride === -1
      ? Number.POSITIVE_INFINITY
      : shop.seatLimitOverride != null && shop.seatLimitOverride > 0
        ? shop.seatLimitOverride
        : shop.plan
          ? PLAN_SEAT_LIMITS[shop.plan]
          : 0;

  const current = await db.membership.count({
    where: { barbershopId, isActive: true },
  });

  return { allowed: current < limit, current, limit };
}

// Atalho pra checar um recurso
export function planHasFeature(
  plan: Plan,
  feature: keyof (typeof PLAN_FEATURES)["pro"],
) {
  return PLAN_FEATURES[plan][feature];
}
