/**
 * TEST-06 — Comandas: Cancelamento
 *
 * Tests cancelarComanda from
 * src/app/(dashboard)/dashboard/comandas/actions.ts
 *
 * Key business rules:
 * - Only owners can cancel (requireRole(["owner"]))
 * - Stock rollback only when cancelling a CLOSED comanda
 * - Appointment cancelled (if not already cancelled/completed)
 * - CRM edge case: open comanda cancelled + appointment already completed →
 *   increment was deferred by updateAppointmentStatusCore, must be done here
 *
 * Failure criteria:
 * - Remove requireRole check → any role can cancel
 * - Remove "already cancelled" guard → double-cancel allowed
 * - Remove closed-comanda stock check → stock never restored
 * - Remove CRM edge case → totalVisits missed when appointment completed first
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { ComandaStatus, MemberRole, StockMovementReason } from "@prisma/client";
import { cancelarComanda } from "@/app/(dashboard)/dashboard/comandas/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findFirst: vi.fn() },
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

function makeCancelamentoTx() {
  return {
    product: { update: vi.fn().mockResolvedValue({}) },
    stockMovement: { create: vi.fn().mockResolvedValue({}) },
    comanda: { update: vi.fn().mockResolvedValue({}) },
    appointment: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    client: { update: vi.fn().mockResolvedValue({}) },
  };
}

function mockComanda(overrides: {
  status?: ComandaStatus;
  appointmentId?: string | null;
  items?: unknown[];
} = {}) {
  vi.mocked(db.comanda.findFirst).mockResolvedValue({
    id: COMANDA_A,
    barbershopId: SHOP_A,
    status: ComandaStatus.open,
    appointmentId: null,
    items: [],
    ...overrides,
  } as never);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

let tx: ReturnType<typeof makeCancelamentoTx>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());

  tx = makeCancelamentoTx();
  vi.mocked(db.$transaction).mockImplementation(
    async (fn: unknown) => (fn as (t: typeof tx) => unknown)(tx),
  );
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("cancelarComanda()", () => {
  it("calls requireRole with ['owner'] (not just requireMembership)", async () => {
    mockComanda();

    try {
      await cancelarComanda(COMANDA_A);
    } catch {
      /* redirect */
    }

    expect(vi.mocked(requireRole)).toHaveBeenCalledWith(["owner"]);
  });

  it("throws when comanda not found", async () => {
    vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow(
      "Comanda não encontrada.",
    );
  });

  it("throws when comanda is already cancelled (idempotency guard)", async () => {
    mockComanda({ status: ComandaStatus.cancelled });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("Já cancelada.");
  });

  it("sets comanda status to cancelled in transaction", async () => {
    mockComanda({ status: ComandaStatus.open });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMANDA_A },
        data: { status: ComandaStatus.cancelled },
      }),
    );
  });

  it("restores product stock when cancelling a CLOSED comanda", async () => {
    mockComanda({
      status: ComandaStatus.closed,
      items: [
        { id: "item-1", type: "product", productId: "prod-1", quantity: 2, totalInCents: 3000 },
      ],
    });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data: { stockQuantity: { increment: 2 } },
      }),
    );
  });

  it("creates stockMovement with 'return' reason when cancelling a closed comanda", async () => {
    mockComanda({
      status: ComandaStatus.closed,
      items: [
        { id: "item-1", type: "product", productId: "prod-1", quantity: 2, totalInCents: 3000 },
      ],
    });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "prod-1",
          reason: StockMovementReason.return,
          quantity: 2, // positive (restore)
          barbershopId: SHOP_A,
        }),
      }),
    );
  });

  it("does NOT restore stock when cancelling an OPEN comanda (stock was never decremented)", async () => {
    mockComanda({
      status: ComandaStatus.open,
      items: [
        { id: "item-1", type: "product", productId: "prod-1", quantity: 2, totalInCents: 3000 },
      ],
    });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("cancels linked appointment when appointmentId is set (if not already cancelled/completed)", async () => {
    mockComanda({ appointmentId: "appt-1" });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "appt-1",
          status: { notIn: ["cancelled", "completed"] },
        }),
        data: { status: "cancelled" },
      }),
    );
  });

  it("does not call appointment.updateMany when no appointmentId", async () => {
    mockComanda({ appointmentId: null });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("increments CRM when open comanda cancelled and appointment was already completed (edge case)", async () => {
    // Edge case: appointment was completed via updateAppointmentStatusCore which deferred
    // CRM because there was an open comanda. Now that comanda is cancelled, CRM must happen here.
    mockComanda({ status: ComandaStatus.open, appointmentId: "appt-1" });
    tx.appointment.findFirst.mockResolvedValue({ clientId: "client-1" });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "appt-1",
          status: "completed",
        }),
      }),
    );
    expect(tx.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1" },
        data: expect.objectContaining({ totalVisits: { increment: 1 } }),
      }),
    );
  });

  it("does not update CRM when open comanda cancelled but appointment NOT completed", async () => {
    mockComanda({ status: ComandaStatus.open, appointmentId: "appt-1" });
    tx.appointment.findFirst.mockResolvedValue(null); // appointment not completed

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("does not update CRM when CLOSED comanda cancelled (CRM was done at fecharComanda)", async () => {
    mockComanda({
      status: ComandaStatus.closed,
      appointmentId: "appt-1",
      items: [],
    });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    // CRM edge case only applies to open comandas
    expect(tx.appointment.findFirst).not.toHaveBeenCalled();
    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("does not update CRM when open comanda has no appointmentId", async () => {
    mockComanda({ status: ComandaStatus.open, appointmentId: null });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.appointment.findFirst).not.toHaveBeenCalled();
    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("queries comanda by id + barbershopId from membership (tenant isolation)", async () => {
    mockComanda();

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: COMANDA_A,
          barbershopId: SHOP_A,
        }),
      }),
    );
  });

  it("logs comanda.warn with barbershopId, comandaId and original status", async () => {
    const { log } = await import("@/lib/logger");
    mockComanda({ status: ComandaStatus.open });

    await expect(cancelarComanda(COMANDA_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.comanda.warn)).toHaveBeenCalledWith(
      expect.stringContaining("cancelada"),
      expect.objectContaining({
        barbershopId: SHOP_A,
        comandaId: COMANDA_A,
        status: ComandaStatus.open, // original status before cancellation
      }),
    );
  });
});
