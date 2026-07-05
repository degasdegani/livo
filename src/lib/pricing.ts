// ============================================================
// LIVO — Preços por plano (fonte única, client-safe)
// ============================================================
// Vive num módulo SEM imports com side-effect (só `import type`), para poder
// ser importado tanto do servidor quanto de client components. Não colocar em
// plans.ts diretamente: plans.ts importa `@/lib/db` (PrismaClient instancia no
// topo do módulo), o que quebraria o bundle do cliente. plans.ts re-exporta
// PLAN_PRICING para o lado servidor manter uma importação única.

import type { Plan } from "@prisma/client";

// `yearly: null` = plano sem opção anual (START é só mensal por enquanto).
// Valores em reais (R$). NESTA ETAPA a assinatura ainda é sempre "pro" — a
// seleção de plano vem em fase futura (E4); aqui só centralizamos a fonte.
export const PLAN_PRICING: Record<
  Plan,
  { monthly: number; yearly: number | null }
> = {
  start: { monthly: 59.9, yearly: null },
  pro: { monthly: 169.9, yearly: 1839.9 },
  // prime ainda não é vendido — placeholder com os mesmos valores do pro.
  prime: { monthly: 169.9, yearly: 1839.9 },
};

// Dias de trial por plano — FONTE ÚNICA compartilhada. Antes o número vivia
// hardcoded em onboarding/actions.ts (baseTrial = plan === "pro" ? 15 : 7) e a
// landing repetia "30 dias" desatualizado. Centralizado aqui (módulo client-safe)
// para o onboarding e a landing consumirem o mesmo valor sem divergir.
export const TRIAL_DAYS: Record<Plan, number> = {
  start: 7,
  pro: 15,
  // prime ainda não é vendido — espelha o pro por ora.
  prime: 15,
};
