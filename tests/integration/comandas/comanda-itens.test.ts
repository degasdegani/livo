/**
 * TEST-06 — Comandas: Itens (Serviços, Produtos, Remoção)
 *
 * Tests addServicoItem, addProdutoItem, removeItem from
 * src/app/(dashboard)/dashboard/comandas/actions.ts
 *
 * Failure criteria:
 * - Remove barbershopId from service query → cross-tenant service accepted
 * - Remove isActive check → inactive service/product added
 * - Remove stock check → negative stock allowed
 * - Change totalInCents formula → wrong subtotal
 * - Remove barbershopId from removeItem comanda check → cross-tenant removal
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { ComandaStatus, MemberRole } from "@prisma/client";
import {
  addServicoItem,
  addProdutoItem,
  removeItem,
} from "@/app/(dashboard)/dashboard/comandas/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findFirst: vi.fn(), update: vi.fn() },
    comandaItem: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    service: { findFirst: vi.fn() },
    product: { findFirst: vi.fn() },
    membership: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    comanda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const SHOP_B = "shop-b";
const COMANDA_A = "comanda-a";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx(barbershopId = SHOP_A) {
  return makeMembershipContext({ barbershopId, role: MemberRole.owner });
}

function mockOpenComanda() {
  vi.mocked(db.comanda.findFirst).mockResolvedValue({
    id: COMANDA_A,
    barbershopId: SHOP_A,
    status: ComandaStatus.open,
    totalInCents: 5000,
  } as never);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

  // Array-style $transaction: individual ops are called when building the array,
  // so $transaction just needs to resolve with all results.
  vi.mocked(db.$transaction).mockImplementation(
    async (ops: unknown) => Promise.all(ops as Promise<unknown>[]),
  );

  vi.mocked(db.comandaItem.create).mockResolvedValue({} as never);
  vi.mocked(db.comanda.update).mockResolvedValue({} as never);
  vi.mocked(db.comandaItem.delete).mockResolvedValue({} as never);
});

// ── addServicoItem ─────────────────────────────────────────────────────────────

describe("addServicoItem()", () => {
  const SERVICE_A = "service-a";

  it("throws when comanda not found or already closed", async () => {
    vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

    await expect(addServicoItem(COMANDA_A, SERVICE_A)).rejects.toThrow(
      "Comanda não encontrada ou já fechada.",
    );
  });

  it("throws when service not found in barbershop", async () => {
    mockOpenComanda();
    vi.mocked(db.service.findFirst).mockResolvedValue(null);

    await expect(addServicoItem(COMANDA_A, SERVICE_A)).rejects.toThrow(
      "Serviço não encontrado.",
    );
  });

  it("queries service by barbershopId + isActive (rejects cross-tenant and inactive)", async () => {
    mockOpenComanda();
    vi.mocked(db.service.findFirst).mockResolvedValue(null);

    try {
      await addServicoItem(COMANDA_A, SERVICE_A);
    } catch {
      /* expected */
    }

    expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          barbershopId: SHOP_A,
          isActive: true,
        }),
      }),
    );
  });

  it("creates item with type 'service' and correct totalInCents", async () => {
    mockOpenComanda();
    vi.mocked(db.service.findFirst).mockResolvedValue({
      id: SERVICE_A,
      name: "Barba",
      priceInCents: 2500,
    } as never);

    await addServicoItem(COMANDA_A, SERVICE_A);

    expect(vi.mocked(db.comandaItem.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "service",
          totalInCents: 2500,
          unitPriceInCents: 2500,
          quantity: 1,
        }),
      }),
    );
  });

  it("increments comanda.totalInCents by service.priceInCents (subtotal)", async () => {
    mockOpenComanda();
    vi.mocked(db.service.findFirst).mockResolvedValue({
      id: SERVICE_A,
      name: "Corte",
      priceInCents: 3500,
    } as never);

    await addServicoItem(COMANDA_A, SERVICE_A);

    expect(vi.mocked(db.comanda.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMANDA_A },
        data: { totalInCents: { increment: 3500 } },
      }),
    );
  });

  it("runs item creation and total increment in a single transaction", async () => {
    mockOpenComanda();
    vi.mocked(db.service.findFirst).mockResolvedValue({
      id: SERVICE_A,
      name: "Corte",
      priceInCents: 2000,
    } as never);

    await addServicoItem(COMANDA_A, SERVICE_A);

    expect(vi.mocked(db.$transaction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.comandaItem.create)).toHaveBeenCalled();
    expect(vi.mocked(db.comanda.update)).toHaveBeenCalled();
  });
});

// ── addProdutoItem ─────────────────────────────────────────────────────────────

describe("addProdutoItem()", () => {
  const PROD_A = "product-a";

  // addProdutoItem uses callback-style $transaction with atomic updateMany.
  // Share db mock references so existing assertions (db.comandaItem.create,
  // db.comanda.update) still work even though calls go through tx.
  let produtoTx: {
    product: { updateMany: ReturnType<typeof vi.fn> };
    comandaItem: { create: ReturnType<typeof vi.fn> };
    comanda: { update: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    produtoTx = {
      product: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      comandaItem: { create: vi.mocked(db.comandaItem.create) },
      comanda: { update: vi.mocked(db.comanda.update) },
    };
    vi.mocked(db.$transaction).mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") return arg(produtoTx);
      return Promise.all(arg as Promise<unknown>[]);
    });
  });

  it("throws when comanda not found or already closed", async () => {
    vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

    await expect(addProdutoItem(COMANDA_A, PROD_A, 1)).rejects.toThrow(
      "Comanda não encontrada ou já fechada.",
    );
  });

  it("throws when product not found in barbershop", async () => {
    mockOpenComanda();
    vi.mocked(db.product.findFirst).mockResolvedValue(null);

    await expect(addProdutoItem(COMANDA_A, PROD_A, 1)).rejects.toThrow(
      "Produto não encontrado.",
    );
  });

  it("queries product by barbershopId + isActive (rejects cross-tenant and inactive)", async () => {
    mockOpenComanda();
    vi.mocked(db.product.findFirst).mockResolvedValue(null);

    try {
      await addProdutoItem(COMANDA_A, PROD_A, 1);
    } catch {
      /* expected */
    }

    expect(vi.mocked(db.product.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          barbershopId: SHOP_A,
          isActive: true,
        }),
      }),
    );
  });

  it("throws when stock is insufficient for requested quantity", async () => {
    mockOpenComanda();
    vi.mocked(db.product.findFirst).mockResolvedValue({
      id: PROD_A,
      name: "Pomada",
      priceInCents: 1500,
      stockQuantity: 2,
    } as never);
    // Simulate atomic check failure: stockQuantity < requested quantity
    produtoTx.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(addProdutoItem(COMANDA_A, PROD_A, 5)).rejects.toThrow(
      "Estoque insuficiente.",
    );
  });

  it("allows adding exactly the available stock quantity", async () => {
    mockOpenComanda();
    vi.mocked(db.product.findFirst).mockResolvedValue({
      id: PROD_A,
      name: "Pomada",
      priceInCents: 1500,
      stockQuantity: 3,
    } as never);

    await expect(addProdutoItem(COMANDA_A, PROD_A, 3)).resolves.toBeUndefined();
  });

  it("calculates totalInCents as priceInCents × quantity", async () => {
    mockOpenComanda();
    vi.mocked(db.product.findFirst).mockResolvedValue({
      id: PROD_A,
      name: "Pomada",
      priceInCents: 1500,
      stockQuantity: 10,
    } as never);

    await addProdutoItem(COMANDA_A, PROD_A, 3);

    expect(vi.mocked(db.comandaItem.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "product",
          quantity: 3,
          totalInCents: 4500, // 1500 × 3
          unitPriceInCents: 1500,
        }),
      }),
    );
  });

  it("increments comanda.totalInCents by price × quantity (subtotal)", async () => {
    mockOpenComanda();
    vi.mocked(db.product.findFirst).mockResolvedValue({
      id: PROD_A,
      name: "Pomada",
      priceInCents: 2000,
      stockQuantity: 10,
    } as never);

    await addProdutoItem(COMANDA_A, PROD_A, 2);

    expect(vi.mocked(db.comanda.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMANDA_A },
        data: { totalInCents: { increment: 4000 } }, // 2000 × 2
      }),
    );
  });
});

// ── removeItem ─────────────────────────────────────────────────────────────────

describe("removeItem()", () => {
  const ITEM_A = "item-a";

  it("throws when item not found", async () => {
    vi.mocked(db.comandaItem.findFirst).mockResolvedValue(null);

    await expect(removeItem(ITEM_A, COMANDA_A)).rejects.toThrow(
      "Item não encontrado.",
    );
  });

  it("throws when item.comanda.barbershopId differs from membership.barbershopId (cross-tenant)", async () => {
    vi.mocked(db.comandaItem.findFirst).mockResolvedValue({
      id: ITEM_A,
      totalInCents: 3000,
      comanda: { barbershopId: SHOP_B, status: ComandaStatus.open },
    } as never);

    await expect(removeItem(ITEM_A, COMANDA_A)).rejects.toThrow(
      "Item não encontrado.",
    );
  });

  it("throws when comanda is not open (closed or cancelled)", async () => {
    vi.mocked(db.comandaItem.findFirst).mockResolvedValue({
      id: ITEM_A,
      totalInCents: 2000,
      comanda: { barbershopId: SHOP_A, status: ComandaStatus.closed },
    } as never);

    await expect(removeItem(ITEM_A, COMANDA_A)).rejects.toThrow(
      "Comanda já fechada.",
    );
  });

  it("deletes item and decrements comanda.totalInCents by item.totalInCents", async () => {
    vi.mocked(db.comandaItem.findFirst).mockResolvedValue({
      id: ITEM_A,
      totalInCents: 3500,
      comanda: { barbershopId: SHOP_A, status: ComandaStatus.open },
    } as never);

    await removeItem(ITEM_A, COMANDA_A);

    expect(vi.mocked(db.comandaItem.delete)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ITEM_A } }),
    );
    expect(vi.mocked(db.comanda.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMANDA_A },
        data: { totalInCents: { decrement: 3500 } },
      }),
    );
  });

  it("runs delete and decrement in a single transaction", async () => {
    vi.mocked(db.comandaItem.findFirst).mockResolvedValue({
      id: ITEM_A,
      totalInCents: 2000,
      comanda: { barbershopId: SHOP_A, status: ComandaStatus.open },
    } as never);

    await removeItem(ITEM_A, COMANDA_A);

    expect(vi.mocked(db.$transaction)).toHaveBeenCalledTimes(1);
  });
});
