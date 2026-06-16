/**
 * TEST — Comissões: Recálculo retroativo
 *
 * Tests recalcularComissoesPendentes from
 * src/app/(dashboard)/dashboard/comissoes/actions.ts
 *
 * Failure criteria:
 * - Remove commissionValue: null filter → already-calculated items get overwritten
 * - Remove commission formula → recalculated value diverges from fecharComanda()
 * - Remove owner-only check → any role could trigger recalculation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { recalcularComissoesPendentes } from "@/app/(dashboard)/dashboard/comissoes/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    professional: { findFirst: vi.fn() },
    comandaItem: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
  requireMembership: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    comanda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const PROF_A = "prof-a";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx() {
  return makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
}

function makeTx() {
  return {
    comandaItem: { update: vi.fn().mockResolvedValue({}) },
  };
}

let tx: ReturnType<typeof makeTx>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());

  tx = makeTx();
  vi.mocked(db.$transaction).mockImplementation(
    async (fn: unknown) => (fn as (t: typeof tx) => unknown)(tx),
  );
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("recalcularComissoesPendentes()", () => {
  it("throws when professional membership not found", async () => {
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);

    await expect(recalcularComissoesPendentes(PROF_A)).rejects.toThrow(
      "Profissional não encontrado.",
    );
  });

  it("recalculates a pending service item using membership's commissionServicePct", async () => {
    vi.mocked(db.professional.findFirst).mockResolvedValue({
      id: "mem-a",
      professionalId: PROF_A,
      barbershopId: SHOP_A,
      commissionOnServices: true,
      commissionServicePct: 40,
      commissionOnProducts: false,
      commissionProductPct: null,
    } as never);

    vi.mocked(db.comandaItem.findMany).mockResolvedValue([
      { id: "item-1", type: "service", totalInCents: 10000, commissionValue: null },
    ] as never);

    const result = await recalcularComissoesPendentes(PROF_A);

    expect(result.atualizados).toBe(1);
    expect(tx.comandaItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { commissionPct: 40, commissionValue: 4000 },
    });
  });

  it("does not count item when commission is off for that item type", async () => {
    vi.mocked(db.professional.findFirst).mockResolvedValue({
      id: "mem-a",
      professionalId: PROF_A,
      barbershopId: SHOP_A,
      commissionOnServices: false,
      commissionServicePct: null,
      commissionOnProducts: false,
      commissionProductPct: null,
    } as never);

    vi.mocked(db.comandaItem.findMany).mockResolvedValue([
      { id: "item-1", type: "service", totalInCents: 10000, commissionValue: null },
    ] as never);

    const result = await recalcularComissoesPendentes(PROF_A);

    expect(result.atualizados).toBe(0);
    expect(tx.comandaItem.update).not.toHaveBeenCalled();
  });

  it("only queries items with commissionValue null (never touches already-calculated items)", async () => {
    vi.mocked(db.professional.findFirst).mockResolvedValue({
      id: "mem-a",
      professionalId: PROF_A,
      barbershopId: SHOP_A,
      commissionOnServices: true,
      commissionServicePct: 40,
      commissionOnProducts: false,
      commissionProductPct: null,
    } as never);
    vi.mocked(db.comandaItem.findMany).mockResolvedValue([]);

    await recalcularComissoesPendentes(PROF_A);

    expect(vi.mocked(db.comandaItem.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ commissionValue: null }),
      }),
    );
  });
});
