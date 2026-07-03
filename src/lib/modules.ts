// ============================================================
// LIVO — Módulos PRO-only: acesso por plano + add-on avulso por conta
// ============================================================
// Espelha o padrão de src/lib/clube-flag.ts: leitura simples (uma query,
// sem cache/memoization) para decidir visibilidade via boolean, e um
// require* que lança erro bare (sem try/catch no chamador) como hard-stop
// nas escritas/páginas realmente restritas.
//
// ESCOPO: cobre os módulos PRO-only EXCETO Clube — o Clube tem mecanismo
// próprio e independente (clubEnabled / clube-flag.ts) e NÃO entra aqui.
//
// IMPORTANTE (E2): este helper é criado mas AINDA NÃO é chamado em nenhuma
// page, action ou nav. A aplicação dos gates é a fase seguinte (E3).

import { Plan, PlanStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type ModuleKey =
  | "comissoes"
  | "marketing"
  | "insights"
  | "profissionais"
  | "livia"
  | "tv";

// Módulos inclusos em cada plano. START não inclui nenhum destes 6 (são os
// PRO-only). Um add-on avulso (Barbershop.moduleAddOns) soma a isto por conta.
export const PLAN_MODULES: Record<Plan, Set<ModuleKey>> = {
  start: new Set<ModuleKey>([]),
  pro: new Set<ModuleKey>([
    "comissoes",
    "marketing",
    "insights",
    "profissionais",
    "livia",
    "tv",
  ]),
  prime: new Set<ModuleKey>([
    "comissoes",
    "marketing",
    "insights",
    "profissionais",
    "livia",
    "tv",
  ]),
};

/**
 * Retorna true se a barbearia tem acesso ao módulo — por estar incluso no
 * plano OU por ser um add-on avulso gravado na conta. Leitura simples (uma
 * query, sem cache), no mesmo estilo de isClubEnabled.
 *
 * Regra de acesso total: planStatus === lifetime (ex.: TX Barbearia) libera
 * TODOS os módulos, independente do campo `plan` — isenção estrutural, não
 * por identidade hardcoded (mesma filosofia de email-gate/terms-gate).
 *
 * Uso previsto (E3):
 *   - Server Component / UI: `if (!(await hasModuleAccess(id, "tv"))) ...`
 *   - Server Action de escrita: `await requireModuleAccess(id, "tv")`
 */
export async function hasModuleAccess(
  barbershopId: string,
  module: ModuleKey,
): Promise<boolean> {
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { plan: true, moduleAddOns: true, planStatus: true },
  });

  if (!barbershop) return false;

  // TX / vitalícia: acesso total, independente do plano.
  if (barbershop.planStatus === PlanStatus.lifetime) return true;

  return (
    PLAN_MODULES[barbershop.plan].has(module) ||
    barbershop.moduleAddOns.includes(module)
  );
}

/**
 * Erro identificável lançado quando a barbearia não tem acesso ao módulo.
 * A mensagem inclui o módulo (facilita debug vs. o ClubDisabledError genérico).
 */
export class ModuleLockedError extends Error {
  constructor(module: ModuleKey) {
    super(`MODULE_LOCKED:${module}`);
    this.name = "ModuleLockedError";
  }
}

/**
 * Hard-stop para escritas/páginas restritas. Lança ModuleLockedError se a
 * barbearia não tiver acesso — throw bare, sem try/catch interno, mesmo
 * padrão de requireClubEnabled (o chamador/Next.js surfacea o erro).
 */
export async function requireModuleAccess(
  barbershopId: string,
  module: ModuleKey,
): Promise<void> {
  const has = await hasModuleAccess(barbershopId, module);
  if (!has) throw new ModuleLockedError(module);
}
