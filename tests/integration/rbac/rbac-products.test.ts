/**
 * TEST-03 — RBAC: Products actions
 *
 * Guards tested (produtos/actions.ts):
 *   - getProducts:          requireMembership  — all roles, no session blocked
 *   - createProduct:        requireRole(["owner","reception"]) — barber blocked
 *   - updateProduct:        requireRole(["owner","reception"]) — barber blocked
 *   - toggleProductActive:  requireRole(["owner","reception"]) — barber blocked
 *   - deleteCategory:       requireRole("owner") — reception AND barber blocked
 *   - createCategory:       requireRole(["owner","reception"]) — barber blocked
 *   - addStockMovement:     requireRole(["owner","reception"]) — barber blocked
 *
 * Failure criterion:
 *   - Remove requireRole from createProduct → toHaveBeenCalledWith assertion fails
 *   - Widen deleteCategory to include reception → role argument assertion fails
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import {
  getProducts,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  toggleProductActive,
  addStockMovement,
} from "@/app/(dashboard)/dashboard/produtos/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { MemberRole } from "@prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    productCategory: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (fns: unknown[]) =>
      Promise.all(fns),
    ),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
const receptionCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.reception });
const barberCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.barber });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.product.findMany).mockResolvedValue([]);
  vi.mocked(db.productCategory.findMany).mockResolvedValue([]);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RBAC — Products", () => {
  describe("getProducts() & getCategories() — requireMembership", () => {
    it("allows owner to read products", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

      await getProducts();

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("allows receptionist to read products", async () => {
      vi.mocked(requireMembership).mockResolvedValue(receptionCtx());

      await getProducts();

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("allows barber to read products", async () => {
      vi.mocked(requireMembership).mockResolvedValue(barberCtx());

      await getProducts();

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("blocks unauthenticated access to products", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(getProducts()).rejects.toThrow();

      expect(vi.mocked(db.product.findMany)).not.toHaveBeenCalled();
    });

    it("allows owner to read categories", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

      await getCategories();

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });
  });

  describe("createCategory() — requireRole([owner, reception])", () => {
    it("calls requireRole with owner and reception", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.productCategory.create).mockResolvedValue({} as never);

      await createCategory("Produtos");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner", "reception"]),
      );
    });

    it("allows owner to create category", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.productCategory.create).mockResolvedValue({} as never);

      const result = await createCategory("Produtos");

      expect(result.ok).toBe(true);
    });

    it("allows receptionist to create category", async () => {
      vi.mocked(requireRole).mockResolvedValue(receptionCtx());
      vi.mocked(db.productCategory.create).mockResolvedValue({} as never);

      const result = await createCategory("Produtos");

      expect(result.ok).toBe(true);
    });

    it("blocks barber from creating category", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(createCategory("Produtos")).rejects.toThrow();

      expect(vi.mocked(db.productCategory.create)).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory() — requireRole([owner, reception])", () => {
    it("calls requireRole with owner and reception", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.productCategory.updateMany).mockResolvedValue({ count: 1 });

      await updateCategory("cat-1", "Nova");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner", "reception"]),
      );
    });

    it("blocks barber from updating category", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(updateCategory("cat-1", "Nova")).rejects.toThrow();

      expect(vi.mocked(db.productCategory.updateMany)).not.toHaveBeenCalled();
    });
  });

  describe("deleteCategory() — requireRole(owner) only", () => {
    it("calls requireRole with owner only — not an array", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.product.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(db.productCategory.deleteMany).mockResolvedValue({ count: 1 });

      await deleteCategory("cat-1");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from deleting category — owner-only action", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(deleteCategory("cat-1")).rejects.toThrow();

      expect(vi.mocked(db.productCategory.deleteMany)).not.toHaveBeenCalled();
    });

    it("blocks barber from deleting category", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(deleteCategory("cat-1")).rejects.toThrow();

      expect(vi.mocked(db.productCategory.deleteMany)).not.toHaveBeenCalled();
    });
  });

  describe("createProduct() — requireRole([owner, reception])", () => {
    it("calls requireRole with owner and reception", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.product.create).mockResolvedValue({ id: "prod-1" } as never);

      await createProduct({
        name: "Gel",
        costInCents: 1000,
        priceInCents: 2000,
        stockQuantity: 0,
        minStockAlert: 5,
      });

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner", "reception"]),
      );
    });

    it("blocks barber from creating product", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(
        createProduct({
          name: "Gel",
          costInCents: 1000,
          priceInCents: 2000,
          stockQuantity: 0,
          minStockAlert: 5,
        }),
      ).rejects.toThrow();

      expect(vi.mocked(db.product.create)).not.toHaveBeenCalled();
    });
  });

  describe("updateProduct() — requireRole([owner, reception])", () => {
    it("calls requireRole with owner and reception", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.product.updateMany).mockResolvedValue({ count: 1 });

      await updateProduct({
        id: "prod-1",
        name: "Gel",
        costInCents: 1000,
        priceInCents: 2000,
        minStockAlert: 5,
        isActive: true,
      });

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner", "reception"]),
      );
    });

    it("blocks barber from updating product", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(
        updateProduct({
          id: "prod-1",
          name: "Gel",
          costInCents: 1000,
          priceInCents: 2000,
          minStockAlert: 5,
          isActive: true,
        }),
      ).rejects.toThrow();
    });
  });

  describe("toggleProductActive() — requireRole([owner, reception])", () => {
    it("blocks barber from toggling product active state", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(toggleProductActive("prod-1", false)).rejects.toThrow();

      expect(vi.mocked(db.product.updateMany)).not.toHaveBeenCalled();
    });
  });

  describe("addStockMovement() — requireRole([owner, reception])", () => {
    it("calls requireRole with owner and reception", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: "prod-1",
        stockQuantity: 10,
        barbershopId: SHOP_A,
      } as never);
      vi.mocked(db.stockMovement.create).mockResolvedValue({} as never);
      vi.mocked(db.product.update).mockResolvedValue({} as never);

      await addStockMovement({
        productId: "prod-1",
        quantity: 5,
        reason: "purchase",
      });

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner", "reception"]),
      );
    });

    it("blocks barber from adding stock movement", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(
        addStockMovement({ productId: "prod-1", quantity: 5, reason: "purchase" }),
      ).rejects.toThrow();
    });
  });
});
