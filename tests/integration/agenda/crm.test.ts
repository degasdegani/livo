/**
 * TEST-04 — Agenda: CRM update logic in updateAppointmentStatusCore
 *
 * CRM invariants (totalVisits / lastVisitAt):
 *   1. status → completed, has clientId, no linked comanda → CRM incremented
 *   2. status → completed, linked comanda exists → CRM NOT incremented (comanda owns it)
 *   3. status → cancelled → CRM NOT updated; open comanda cancelled
 *   4. appointment was already "completed" → CRM NOT incremented (idempotent)
 *   5. no clientId (walk-in) → CRM NOT updated
 *   6. status → no_show → CRM NOT updated, comanda NOT cancelled
 *
 * Failure criterion:
 *   - Remove comanda check → totalVisits double-counted when comanda present
 *   - Remove `appointment.status !== "completed"` guard → CRM incremented on re-completion
 *   - Remove comanda.updateMany when cancelled → open comanda left dangling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { updateAppointmentStatusCore } from "@/lib/appointment-core";
import { makeAppointment } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    appointment: { findFirst: vi.fn() },
    client: { update: vi.fn() },
    comanda: { updateMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const CLIENT_A = "client-a";
const ownerAuth = { role: "owner", professionalId: null, barbershopId: SHOP_A };

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTxMock() {
  return {
    appointment: { update: vi.fn().mockResolvedValue({}) },
    comanda: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    client: { update: vi.fn().mockResolvedValue({}) },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("CRM — totalVisits / lastVisitAt", () => {
  it("increments totalVisits and sets lastVisitAt when completed with clientId and no comanda", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: CLIENT_A,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    tx.comanda.findFirst.mockResolvedValue(null); // no linked comanda
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await updateAppointmentStatusCore(
      "appt-a",
      "completed",
      ownerAuth,
    );

    expect(result.success).toBe(true);
    expect(tx.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CLIENT_A },
        data: expect.objectContaining({
          totalVisits: { increment: 1 },
          lastVisitAt: expect.any(Date),
        }),
      }),
    );
  });

  it("does NOT update CRM when completed but a linked comanda exists (comanda owns CRM)", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: CLIENT_A,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    tx.comanda.findFirst.mockResolvedValue({ id: "comanda-a" }); // comanda present
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "completed", ownerAuth);

    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("does NOT update CRM when status is cancelled", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: CLIENT_A,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "cancelled", ownerAuth);

    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("does NOT update CRM when appointment was already completed (idempotent guard)", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: CLIENT_A,
        status: "completed", // already completed
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "completed", ownerAuth);

    expect(tx.client.update).not.toHaveBeenCalled();
    expect(tx.comanda.findFirst).not.toHaveBeenCalled();
  });

  it("does NOT update CRM when appointment has no linked clientId (walk-in)", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: null, // no client record
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "completed", ownerAuth);

    expect(tx.client.update).not.toHaveBeenCalled();
  });

  it("does NOT update CRM when status is no_show", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: CLIENT_A,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "no_show", ownerAuth);

    expect(tx.client.update).not.toHaveBeenCalled();
  });
});

describe("CRM — Comanda sync on cancellation", () => {
  it("cancels open comanda linked to the appointment when status → cancelled", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: null,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "cancelled", ownerAuth);

    expect(tx.comanda.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          appointmentId: "appt-a",
          status: "open",
        }),
        data: { status: "cancelled" },
      }),
    );
  });

  it("does NOT cancel comanda when status is not cancelled", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: null,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "no_show", ownerAuth);

    expect(tx.comanda.updateMany).not.toHaveBeenCalled();
  });

  it("does NOT cancel comanda when status → completed", async () => {
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({
        professionalId: "prof-a",
        clientId: null,
        status: "pending",
      }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentStatusCore("appt-a", "completed", ownerAuth);

    expect(tx.comanda.updateMany).not.toHaveBeenCalled();
  });
});
