/**
 * TEST-06 — Comandas: Fechamento
 *
 * Tests fecharComanda from
 * src/app/(dashboard)/dashboard/comandas/actions.ts
 *
 * Transaction steps tested:
 *   1. Commission per item (service/product, based on profMembership)
 *   2. Stock decrement + stockMovement for product items
 *   3. Comanda closed with correct status, paymentMethod, totalFinal
 *   4. Linked appointment → completed (if not already completed/cancelled)
 *   5. CRM: client.totalVisits+1, lastVisitAt (if clientId)
 *
 * Failure criteria:
 * - Remove Math.max(0, ...) → discount allows negative totalFinal
 * - Remove commission logic → commissions never written to items
 * - Remove stock step → product stock never decremented
 * - Remove appointment sync → appointment stays pending after close
 * - Remove CRM step → totalVisits never incremented on comanda close
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { ComandaStatus, MemberRole, StockMovementReason } from "@prisma/client";
import { fecharComanda } from "@/app/(dashboard)/dashboard/comandas/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findFirst: vi.fn() },
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
const COMANDA_A = "comanda-a";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx() {
  return makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
}

function makeFechamentoTx() {
  return {
    comandaItem: { update: vi.fn().mockResolvedValue({}) },
    product: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    stockMovement: { create: vi.fn().mockResolvedValue({}) },
    comanda: { update: vi.fn().mockResolvedValue({}) },
    appointment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    client: { update: vi.fn().mockResolvedValue({}) },
  };
}

function mockOpenComanda(overrides: {
  totalInCents?: number;
  appointmentId?: string | null;
  clientId?: string | null;
  items?: unknown[];
} = {}) {
  vi.mocked(db.comanda.findFirst).mockResolvedValue({
    id: COMANDA_A,
    barbershopId: SHOP_A,
    status: ComandaStatus.open,
    professionalId: "prof-a",
    totalInCents: 10000,
    appointmentId: null,
    clientId: null,
    items: [],
    ...overrides,
  } as never);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

let tx: ReturnType<typeof makeFechamentoTx>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
  vi.mocked(db.membership.findFirst).mockResolvedValue(null);

  tx = makeFechamentoTx();
  vi.mocked(db.$transaction).mockImplementation(
    async (fn: unknown) => (fn as (t: typeof tx) => unknown)(tx),
  );
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("fecharComanda()", () => {
  it("throws when comanda not found or not open", async () => {
    vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow(
      "Comanda não encontrada ou já fechada.",
    );
  });

  it("applies discount: totalFinal = totalInCents − discountInCents", async () => {
    mockOpenComanda({ totalInCents: 10000 });

    await expect(fecharComanda(COMANDA_A, "pix", 2000)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(tx.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalInCents: 8000 }),
      }),
    );
  });

  it("clamps totalFinal to 0 when discount exceeds total (no negative values)", async () => {
    mockOpenComanda({ totalInCents: 5000 });

    await expect(fecharComanda(COMANDA_A, "pix", 9999)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(tx.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalInCents: 0 }),
      }),
    );
  });

  it("records service commission when profMembership has commissionOnServices enabled", async () => {
    mockOpenComanda({
      items: [
        { id: "item-1", type: "service", totalInCents: 5000, productId: null, quantity: 1 },
      ],
    });
    vi.mocked(db.membership.findFirst).mockResolvedValue({
      commissionOnServices: true,
      commissionServicePct: 20,
      commissionOnProducts: false,
      commissionProductPct: null,
    } as never);

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.comandaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          commissionPct: 20,
          commissionValue: 1000, // 5000 × 20 / 100
        }),
      }),
    );
  });

  it("records product commission when commissionOnProducts is enabled", async () => {
    mockOpenComanda({
      items: [
        { id: "item-2", type: "product", totalInCents: 6000, productId: "prod-1", quantity: 2 },
      ],
    });
    vi.mocked(db.membership.findFirst).mockResolvedValue({
      commissionOnServices: false,
      commissionServicePct: null,
      commissionOnProducts: true,
      commissionProductPct: 10,
    } as never);

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.comandaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-2" },
        data: expect.objectContaining({
          commissionPct: 10,
          commissionValue: 600, // 6000 × 10 / 100
        }),
      }),
    );
  });

  it("records null commission when commissionOnServices is false", async () => {
    mockOpenComanda({
      items: [
        { id: "item-1", type: "service", totalInCents: 5000, productId: null, quantity: 1 },
      ],
    });
    vi.mocked(db.membership.findFirst).mockResolvedValue({
      commissionOnServices: false,
      commissionServicePct: null,
      commissionOnProducts: false,
      commissionProductPct: null,
    } as never);

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.comandaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ commissionPct: null, commissionValue: null }),
      }),
    );
  });

  it("records null commission when no profMembership found for professional", async () => {
    mockOpenComanda({
      items: [
        { id: "item-1", type: "service", totalInCents: 4000, productId: null, quantity: 1 },
      ],
    });
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.comandaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ commissionPct: null, commissionValue: null }),
      }),
    );
  });

  it("decrements product stock for each product item", async () => {
    mockOpenComanda({
      items: [
        { id: "item-2", type: "product", productId: "prod-1", quantity: 3, totalInCents: 4500 },
      ],
    });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "prod-1" }),
        data: { stockQuantity: { decrement: 3 } },
      }),
    );
  });

  it("creates stockMovement with comanda_use reason for each product item", async () => {
    mockOpenComanda({
      items: [
        { id: "item-2", type: "product", productId: "prod-1", quantity: 2, totalInCents: 3000 },
      ],
    });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "prod-1",
          reason: StockMovementReason.comanda_use,
          quantity: -2,
          barbershopId: SHOP_A,
        }),
      }),
    );
  });

  it("does not touch stock for service items", async () => {
    mockOpenComanda({
      items: [
        { id: "item-1", type: "service", productId: null, quantity: 1, totalInCents: 5000 },
      ],
    });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("closes comanda with status closed, paymentMethod and totalInCents in transaction", async () => {
    mockOpenComanda({ totalInCents: 7500 });

    await expect(fecharComanda(COMANDA_A, "credit_card")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(tx.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMANDA_A },
        data: expect.objectContaining({
          status: ComandaStatus.closed,
          paymentMethod: "credit_card",
          totalInCents: 7500,
        }),
      }),
    );
  });

  it("updates linked appointment to completed when appointmentId is set", async () => {
    mockOpenComanda({ appointmentId: "appt-1" });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "appt-1",
          status: { notIn: ["completed", "cancelled"] },
        }),
        data: { status: "completed" },
      }),
    );
  });

  it("does not call appointment.updateMany when no appointmentId", async () => {
    mockOpenComanda({ appointmentId: null });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("increments client.totalVisits and sets lastVisitAt when clientId is present (CRM)", async () => {
    mockOpenComanda({ clientId: "client-1" });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1" },
        data: expect.objectContaining({
          totalVisits: { increment: 1 },
          lastVisitAt: expect.any(Date),
        }),
      }),
    );
  });

  it("does not call client.update when clientId is absent", async () => {
    mockOpenComanda({ clientId: null });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("logs comanda.info with barbershopId, comandaId, paymentMethod and totalInCents", async () => {
    const { log } = await import("@/lib/logger");
    mockOpenComanda({ totalInCents: 7500 });

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.comanda.info)).toHaveBeenCalledWith(
      expect.stringContaining("fechada"),
      expect.objectContaining({
        barbershopId: SHOP_A,
        comandaId: COMANDA_A,
        paymentMethod: "pix",
        totalInCents: 7500,
      }),
    );
  });

  it("queries comanda by id + barbershopId + status open (tenant + state guard)", async () => {
    mockOpenComanda();

    await expect(fecharComanda(COMANDA_A, "pix")).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: COMANDA_A,
          barbershopId: SHOP_A,
          status: ComandaStatus.open,
        }),
      }),
    );
  });
});
