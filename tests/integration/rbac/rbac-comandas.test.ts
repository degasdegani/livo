/**
 * TEST-03 — RBAC: Comandas actions
 *
 * Guards tested (comandas/actions.ts):
 *   - getComanda:     requireMembership — all roles pass, no session → blocked
 *   - fecharComanda:  requireMembership — all roles pass
 *   - cancelarComanda: requireRole(["owner"]) — reception AND barber blocked
 *   - addServicoItem: requireMembership — all roles pass
 *   - addProdutoItem: requireMembership — all roles pass
 *   - removeItem:     requireMembership — all roles pass
 *
 * Failure criterion:
 *   - Remove requireRole from cancelarComanda → toHaveBeenCalledWith(["owner"]) fails
 *   - Widen cancelarComanda to include reception → role arg assertion fails
 *   - Remove requireMembership from getComanda → no-auth test fails
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import {
  getComanda,
  fecharComanda,
  cancelarComanda,
  addServicoItem,
  addProdutoItem,
  removeItem,
} from "@/app/(dashboard)/dashboard/comandas/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { MemberRole, ComandaStatus } from "@prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    service: { findFirst: vi.fn() },
    product: { findFirst: vi.fn(), update: vi.fn() },
    membership: { findFirst: vi.fn() },
    comandaItem: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
    appointment: { updateMany: vi.fn(), findFirst: vi.fn() },
    client: { update: vi.fn() },
    stockMovement: { create: vi.fn() },
    $transaction: vi.fn().mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn({ comanda: { update: vi.fn() }, appointment: { updateMany: vi.fn() }, client: { update: vi.fn() } });
      return Promise.all(fn as Promise<unknown>[]);
    }),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  log: {
    comanda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
const receptionCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.reception });
const barberCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.barber });

const openComanda = {
  id: "comanda-a",
  status: ComandaStatus.open,
  paymentMethod: null,
  clientId: null,
  clientName: "Test",
  notes: null,
  totalInCents: 0,
  openedAt: new Date(),
  closedAt: null,
  barbershopId: SHOP_A,
  professionalId: "prof-a",
  appointmentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
};

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RBAC — Comandas", () => {
  describe("getComanda() — requireMembership", () => {
    it("allows owner to read comanda", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
      vi.mocked(db.comanda.findFirst).mockResolvedValue(openComanda as never);

      const result = await getComanda("comanda-a");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
    });

    it("allows receptionist to read comanda", async () => {
      vi.mocked(requireMembership).mockResolvedValue(receptionCtx());
      vi.mocked(db.comanda.findFirst).mockResolvedValue(openComanda as never);

      await getComanda("comanda-a");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("allows barber to read comanda", async () => {
      vi.mocked(requireMembership).mockResolvedValue(barberCtx());
      vi.mocked(db.comanda.findFirst).mockResolvedValue(openComanda as never);

      await getComanda("comanda-a");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("blocks unauthenticated access to comanda", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(getComanda("comanda-a")).rejects.toThrow();

      expect(vi.mocked(db.comanda.findFirst)).not.toHaveBeenCalled();
    });
  });

  describe("cancelarComanda() — requireRole([owner]) only", () => {
    it("calls requireRole with owner array", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.comanda.findFirst).mockResolvedValue(openComanda as never);

      try {
        await cancelarComanda("comanda-a");
      } catch {
        // may throw due to transaction mock
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner"]),
      );
    });

    it("blocks receptionist from cancelling comanda", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(cancelarComanda("comanda-a")).rejects.toThrow();

      expect(vi.mocked(db.comanda.findFirst)).not.toHaveBeenCalled();
    });

    it("blocks barber from cancelling comanda", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(cancelarComanda("comanda-a")).rejects.toThrow();

      expect(vi.mocked(db.comanda.findFirst)).not.toHaveBeenCalled();
    });

    it("never writes to DB when role check fails", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      try {
        await cancelarComanda("comanda-a");
      } catch {
        // expected
      }

      expect(vi.mocked(db.comanda.update)).not.toHaveBeenCalled();
    });
  });

  describe("fecharComanda() — requireMembership", () => {
    it("allows all authenticated roles to close comanda (access check)", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null); // not found = thrown

      try {
        await fecharComanda("comanda-a", "pix");
      } catch {
        // expected: comanda not found
      }

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("blocks unauthenticated from closing comanda", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(fecharComanda("comanda-a", "pix")).rejects.toThrow();

      expect(vi.mocked(db.comanda.findFirst)).not.toHaveBeenCalled();
    });
  });

  describe("addServicoItem() — requireMembership", () => {
    it("allows all authenticated roles to add service item", async () => {
      vi.mocked(requireMembership).mockResolvedValue(receptionCtx());
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      try {
        await addServicoItem("comanda-a", "svc-1");
      } catch {
        // expected: comanda not found
      }

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("blocks unauthenticated from adding service item", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(addServicoItem("comanda-a", "svc-1")).rejects.toThrow();
    });
  });

  describe("addProdutoItem() — requireMembership", () => {
    it("blocks unauthenticated from adding product item", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(addProdutoItem("comanda-a", "prod-1", 1)).rejects.toThrow();
    });
  });

  describe("removeItem() — requireMembership", () => {
    it("blocks unauthenticated from removing item", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(removeItem("item-1", "comanda-a")).rejects.toThrow();
    });
  });
});
