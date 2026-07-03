/**
 * E2.1 — Plans: unit tests for src/lib/modules.ts
 *
 * Tests hasModuleAccess / requireModuleAccess (module gating logic).
 * db is mocked (same pattern as the webhook tests) — pure logic, no real DB.
 *
 * Covers:
 *   - módulo incluso no plano (pro) → true
 *   - módulo fora do plano (start) → false
 *   - add-on avulso (moduleAddOns) sobrepõe o plano → true
 *   - planStatus lifetime (TX) → acesso total, independente do plano
 *   - barbershop inexistente → false
 *   - requireModuleAccess sem acesso → lança ModuleLockedError
 *   - pro com status normal → respeita PLAN_MODULES (lifetime ≠ pro)
 *
 * Failure criterion:
 *   - Remover a regra lifetime → TX perde acesso
 *   - Ignorar moduleAddOns → add-on avulso deixa de funcionar
 *   - START passar a incluir módulos PRO-only → gate vaza
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { PlanStatus } from "@prisma/client";
import {
  hasModuleAccess,
  requireModuleAccess,
  ModuleLockedError,
} from "@/lib/modules";

// ── Mock do db (só o que modules.ts usa) ───────────────────────────────────────
vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn() },
  },
}));

const findUnique = vi.mocked(db.barbershop.findUnique);

// Helper: molda o retorno do findUnique com os campos selecionados por modules.ts
function mockBarbershop(row: {
  plan: "start" | "pro" | "prime";
  planStatus: PlanStatus;
  moduleAddOns?: string[];
} | null) {
  findUnique.mockResolvedValue(
    row === null
      ? null
      : ({
          plan: row.plan,
          planStatus: row.planStatus,
          moduleAddOns: row.moduleAddOns ?? [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
  );
}

const BARBERSHOP_ID = "shop-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hasModuleAccess", () => {
  it("1. plan=pro → tem acesso ao módulo PRO-only (tv)", async () => {
    mockBarbershop({ plan: "pro", planStatus: PlanStatus.active });
    await expect(hasModuleAccess(BARBERSHOP_ID, "tv")).resolves.toBe(true);
  });

  it("2. plan=start → NÃO tem acesso ao módulo PRO-only (tv)", async () => {
    mockBarbershop({ plan: "start", planStatus: PlanStatus.active });
    await expect(hasModuleAccess(BARBERSHOP_ID, "tv")).resolves.toBe(false);
  });

  it("3. plan=start + moduleAddOns:['tv'] → add-on avulso libera o módulo", async () => {
    mockBarbershop({
      plan: "start",
      planStatus: PlanStatus.active,
      moduleAddOns: ["tv"],
    });
    await expect(hasModuleAccess(BARBERSHOP_ID, "tv")).resolves.toBe(true);
  });

  it("3b. add-on de um módulo não vaza para outro módulo", async () => {
    mockBarbershop({
      plan: "start",
      planStatus: PlanStatus.active,
      moduleAddOns: ["tv"],
    });
    await expect(hasModuleAccess(BARBERSHOP_ID, "marketing")).resolves.toBe(
      false,
    );
  });

  it("4. planStatus=lifetime + plan=start → acesso total (TX), independente do plano", async () => {
    mockBarbershop({ plan: "start", planStatus: PlanStatus.lifetime });
    await expect(hasModuleAccess(BARBERSHOP_ID, "tv")).resolves.toBe(true);
    await expect(hasModuleAccess(BARBERSHOP_ID, "comissoes")).resolves.toBe(
      true,
    );
  });

  it("5. barbershop inexistente (findUnique=null) → false", async () => {
    mockBarbershop(null);
    await expect(hasModuleAccess(BARBERSHOP_ID, "tv")).resolves.toBe(false);
  });

  it("7. plan=pro com status normal (não lifetime) → respeita PLAN_MODULES", async () => {
    // pro inclui todos os 6; garante que o true vem do plano, não de lifetime.
    mockBarbershop({ plan: "pro", planStatus: PlanStatus.trial });
    await expect(hasModuleAccess(BARBERSHOP_ID, "insights")).resolves.toBe(
      true,
    );
    // e start em trial continua bloqueado (lifetime não foi confundido com pro)
    mockBarbershop({ plan: "start", planStatus: PlanStatus.trial });
    await expect(hasModuleAccess(BARBERSHOP_ID, "insights")).resolves.toBe(
      false,
    );
  });
});

describe("requireModuleAccess", () => {
  it("6. sem acesso → lança ModuleLockedError com message MODULE_LOCKED:<module>", async () => {
    mockBarbershop({ plan: "start", planStatus: PlanStatus.active });
    await expect(
      requireModuleAccess(BARBERSHOP_ID, "tv"),
    ).rejects.toBeInstanceOf(ModuleLockedError);
    // reseta o mock (a chamada acima consumiu a rejeição) e valida a mensagem
    mockBarbershop({ plan: "start", planStatus: PlanStatus.active });
    await expect(requireModuleAccess(BARBERSHOP_ID, "tv")).rejects.toThrow(
      "MODULE_LOCKED:tv",
    );
  });

  it("com acesso → resolve sem lançar", async () => {
    mockBarbershop({ plan: "pro", planStatus: PlanStatus.active });
    await expect(
      requireModuleAccess(BARBERSHOP_ID, "tv"),
    ).resolves.toBeUndefined();
  });
});
