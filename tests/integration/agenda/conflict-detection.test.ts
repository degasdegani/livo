/**
 * TEST-04 — Agenda: Conflict detection WHERE clause
 *
 * checkConflict is private — tested via createAppointmentCore and updateAppointmentCore.
 *
 * Failure criterion:
 *   - Changing `date: { lt: endDate }` to `lte` → adjacent booking blocked incorrectly
 *   - Changing `endTime: { gt: startDate }` to `gte` → adjacent booking blocked incorrectly
 *   - Removing `status: { notIn: [...] }` → cancelled appointments block slots
 *   - Removing `NOT: { id: excludeId }` → self-conflict on rescheduling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  createAppointmentCore,
  updateAppointmentCore,
} from "@/lib/appointment-core";
import { makeService, makeAppointment } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    service: { findFirst: vi.fn() },
    appointment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    client: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    professional: { findFirst: vi.fn() },
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
const PROF_A = "prof-a";
// 2026-06-15 13:00 UTC = 10:00 Brasília. Service 30 min → endDate = 13:30 UTC.
const DATE_ISO = "2026-06-15T13:00:00.000Z";

const ownerAuth = { role: "owner", professionalId: null, barbershopId: SHOP_A };

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTxMock() {
  return {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    client: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new-client-id" }),
      update: vi.fn().mockResolvedValue({}),
    },
    appointment: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new-appt-id" }),
      update: vi.fn().mockResolvedValue({}),
    },
    comanda: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("checkConflict — WHERE clause structure (via createAppointmentCore)", () => {
  it("uses half-open interval: date < endDate AND endTime > startDate", async () => {
    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await createAppointmentCore({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceId: "svc-a",
      dateISO: DATE_ISO,
      clientName: "Test",
      clientPhone: "11999999999",
    });

    const startDate = new Date(DATE_ISO);
    const endDate = new Date(startDate.getTime() + 30 * 60_000);

    expect(vi.mocked(db.appointment.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          professionalId: PROF_A,
          date: { lt: endDate },
          endTime: { gt: startDate },
        }),
      }),
    );
  });

  it("filters by professionalId — only checks same professional's schedule", async () => {
    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await createAppointmentCore({
      barbershopId: SHOP_A,
      professionalId: "prof-specific",
      serviceId: "svc-a",
      dateISO: DATE_ISO,
      clientName: "Test",
      clientPhone: "11999999999",
    });

    expect(vi.mocked(db.appointment.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          professionalId: "prof-specific",
        }),
      }),
    );
  });

  it("excludes cancelled and no_show statuses (cancelled slot is free)", async () => {
    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await createAppointmentCore({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceId: "svc-a",
      dateISO: DATE_ISO,
      clientName: "Test",
      clientPhone: "11999999999",
    });

    expect(vi.mocked(db.appointment.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["cancelled", "no_show"] },
        }),
      }),
    );
  });

  it("conflict detected → aborts before transaction (no double booking)", async () => {
    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(
      makeAppointment({ id: "blocking-appt" }),
    );

    const result = await createAppointmentCore({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceId: "svc-a",
      dateISO: DATE_ISO,
      clientName: "Test",
      clientPhone: "11999999999",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("conflito");
    expect(vi.mocked(db.$transaction)).not.toHaveBeenCalled();
  });

  it("no conflict when findFirst returns null → proceeds to create", async () => {
    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );
    vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    const result = await createAppointmentCore({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceId: "svc-a",
      dateISO: DATE_ISO,
      clientName: "Test",
      clientPhone: "11999999999",
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.$transaction)).toHaveBeenCalledTimes(1);
  });
});

describe("checkConflict — excludeId self-exclusion (via updateAppointmentCore)", () => {
  it("passes appointmentId as NOT: { id } so appointment does not conflict with itself", async () => {
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(
        makeAppointment({
          id: "appt-self",
          professionalId: PROF_A,
          status: "pending",
          clientPhone: "11999999999",
          clientId: null,
        }),
      )
      .mockResolvedValueOnce(null); // self excluded → no conflict

    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );

    const tx = makeTxMock();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(tx);
    });

    await updateAppointmentCore(
      {
        appointmentId: "appt-self",
        serviceId: "svc-a",
        dateISO: DATE_ISO,
        clientName: "Test",
        clientPhone: "11999999999",
      },
      ownerAuth,
    );

    // Second call to appointment.findFirst is the conflict check
    const conflictCall = vi.mocked(db.appointment.findFirst).mock.calls[1];
    expect(conflictCall[0]).toMatchObject({
      where: expect.objectContaining({
        NOT: { id: "appt-self" },
      }),
    });
  });

  it("rejects when a different appointment occupies the same rescheduled slot", async () => {
    vi.mocked(db.appointment.findFirst)
      .mockResolvedValueOnce(
        makeAppointment({
          professionalId: PROF_A,
          status: "pending",
          clientPhone: "11999999999",
          clientId: null,
        }),
      )
      .mockResolvedValueOnce(makeAppointment({ id: "other-conflict" }));

    vi.mocked(db.service.findFirst).mockResolvedValue(
      makeService({ durationMin: 30 }),
    );

    const result = await updateAppointmentCore(
      {
        appointmentId: "appt-a",
        serviceId: "svc-a",
        dateISO: DATE_ISO,
        clientName: "Test",
        clientPhone: "11999999999",
      },
      ownerAuth,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("conflito");
  });
});
