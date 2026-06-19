/**
 * TEST-02 — Multi-tenant isolation: Comandas
 *
 * Guards tested:
 *   1. getComanda: findFirst({ where: { id, barbershopId } }) — read isolation
 *   2. fecharComanda: same findFirst guard before any write
 *   3. cancelarComanda: requireRole("owner") + findFirst guard
 *   4. addServicoItem: comanda AND service both scoped to barbershopId
 *   5. addProdutoItem: comanda AND product both scoped to barbershopId
 *   6. removeItem: item.comanda.barbershopId !== membership.barbershopId
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
import { makeService } from "../../factories";
import { ComandaStatus } from "@prisma/client";

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
    $transaction: vi.fn(),
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

const SHOP_A = "shop-tenant-a";
const SHOP_B = "shop-tenant-b";
const COMANDA_B = "comanda-from-shop-b";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: "owner" });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
  vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return fn(db);
    return Promise.all(fn as Promise<unknown>[]);
  });
});

// ── Shared comanda fixture ─────────────────────────────────────────────────────

function makeComanda(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Comandas", () => {
  describe("getComanda", () => {
    it("returns null for comanda from another tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      const result = await getComanda(COMANDA_B);

      expect(result).toBeNull();
      expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("fecharComanda", () => {
    it("throws when comanda belongs to another tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      await expect(fecharComanda(COMANDA_B, [{ method: "pix", amountInCents: 0 }])).rejects.toThrow(
        "Comanda não encontrada ou já fechada.",
      );
    });

    it("scopes comanda lookup to authenticated tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      try {
        await fecharComanda(COMANDA_B, [{ method: "pix", amountInCents: 0 }]);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("cancelarComanda", () => {
    it("throws when comanda belongs to another tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      await expect(cancelarComanda(COMANDA_B)).rejects.toThrow(
        "Comanda não encontrada.",
      );
    });

    it("scopes comanda lookup to authenticated owner's tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      try {
        await cancelarComanda(COMANDA_B);
      } catch {
        // Expected throw
      }

      // requireRole + barbershopId in WHERE
      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner"]),
      );
      expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("addServicoItem", () => {
    it("throws when comanda belongs to another tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      await expect(addServicoItem(COMANDA_B, "svc-a")).rejects.toThrow(
        "Comanda não encontrada ou já fechada.",
      );

      expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("rejects service from another tenant even if comanda is valid", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(makeComanda());
      vi.mocked(db.service.findFirst).mockResolvedValue(null); // cross-tenant service

      await expect(addServicoItem("comanda-a", "svc-from-shop-b")).rejects.toThrow(
        "Serviço não encontrado.",
      );

      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("addProdutoItem", () => {
    it("throws when comanda belongs to another tenant", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

      await expect(addProdutoItem(COMANDA_B, "prod-a", 1)).rejects.toThrow(
        "Comanda não encontrada ou já fechada.",
      );
    });

    it("rejects product from another tenant even if comanda is valid", async () => {
      vi.mocked(db.comanda.findFirst).mockResolvedValue(makeComanda());
      vi.mocked(db.product.findFirst).mockResolvedValue(null); // cross-tenant product

      await expect(addProdutoItem("comanda-a", "prod-from-shop-b", 1)).rejects.toThrow(
        "Produto não encontrado.",
      );

      expect(vi.mocked(db.product.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("removeItem", () => {
    it("throws when comanda item belongs to another tenant", async () => {
      // Item found but its comanda.barbershopId is different
      vi.mocked(db.comandaItem.findFirst).mockResolvedValue(
        ({
          id: "item-b",
          comandaId: COMANDA_B,
          type: "service",
          serviceId: null,
          serviceName: "",
          servicePrice: 0,
          productId: null,
          productName: "",
          productPrice: 0,
          quantity: 1,
          unitPriceInCents: 0,
          totalInCents: 0,
          commissionPct: null,
          commissionValue: null,
          comanda: { barbershopId: SHOP_B, status: ComandaStatus.open },
        } as unknown) as never,
      );

      await expect(removeItem("item-b", COMANDA_B)).rejects.toThrow(
        "Item não encontrado.",
      );
    });
  });
});
