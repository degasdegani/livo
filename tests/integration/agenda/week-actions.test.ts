/**
 * Tests for getAgendaWeek (agenda-actions.ts)
 *
 * Verifies:
 *   - Single appointment query spanning 7 days (no N+1)
 *   - Appointments grouped by BRT dateKey
 *   - BusinessHours fetched once for all 7 days
 *   - appointmentScope RBAC applied
 *   - weekDates array has exactly 7 elements starting from weekStartDate
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import { appointmentScope, requireMembership } from "@/lib/permissions";
import { getAgendaWeek } from "@/app/(dashboard)/dashboard/agenda/agenda-actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    professional: { findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    businessHour: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  appointmentScope: vi.fn(),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-week-test";

function membership(role: MemberRole = MemberRole.owner) {
  return {
    barbershopId: SHOP_ID,
    role,
    userId: "user-1",
    membershipId: "mem-1",
    professionalId: null as string | null,
    commissionOnServices: false,
    commissionOnProducts: false,
  };
}

function makeAppointment(dateISO: string, profId = "prof-1") {
  return {
    id: `appt-${dateISO}`,
    date: new Date(dateISO),
    endTime: null,
    status: "confirmed" as const,
    clientId: null,
    clientName: "Cliente",
    clientPhone: null,
    notes: null,
    professionalId: profId,
    serviceId: "svc-1",
    service: { name: "Corte", durationMin: 30, priceInCents: 3500 },
    comanda: null,
    services: [],
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(membership() as never);
  vi.mocked(appointmentScope).mockReturnValue({ barbershopId: SHOP_ID } as never);
  vi.mocked(db.professional.findMany).mockResolvedValue([]);
  vi.mocked(db.appointment.findMany).mockResolvedValue([]);
  vi.mocked(db.businessHour.findMany).mockResolvedValue([]);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getAgendaWeek — weekDates", () => {
  it("returns exactly 7 dateKeys", async () => {
    const result = await getAgendaWeek("2026-06-16");
    expect(result.weekDates).toHaveLength(7);
  });

  it("first dateKey matches weekStartDate", async () => {
    const result = await getAgendaWeek("2026-06-16");
    expect(result.weekDates[0]).toBe("2026-06-16");
  });

  it("last dateKey is 6 days after start", async () => {
    const result = await getAgendaWeek("2026-06-16");
    expect(result.weekDates[6]).toBe("2026-06-22");
  });

  it("appointmentsByDay has a key for every day of the week", async () => {
    const result = await getAgendaWeek("2026-06-16");
    expect(Object.keys(result.appointmentsByDay)).toHaveLength(7);
    expect(result.appointmentsByDay["2026-06-16"]).toBeDefined();
    expect(result.appointmentsByDay["2026-06-22"]).toBeDefined();
  });
});

describe("getAgendaWeek — no N+1 queries", () => {
  it("makes exactly 1 appointment query for the full 7-day range", async () => {
    await getAgendaWeek("2026-06-16");
    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledTimes(1);
  });

  it("makes exactly 1 businessHour query (findMany, not 7x findFirst)", async () => {
    await getAgendaWeek("2026-06-16");
    expect(vi.mocked(db.businessHour.findMany)).toHaveBeenCalledTimes(1);
  });

  it("makes exactly 1 professionals query", async () => {
    await getAgendaWeek("2026-06-16");
    expect(vi.mocked(db.professional.findMany)).toHaveBeenCalledTimes(1);
  });

  it("appointment query spans the full week (gte/lte)", async () => {
    await getAgendaWeek("2026-06-16");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    // gte starts on June 16 BRT
    expect(arg.where.date.gte.toISOString()).toContain("2026-06-16");
    // lte is end of June 22 BRT — in UTC this rolls into June 23 (UTC-3 offset)
    const lteBRT = new Date(arg.where.date.lte.getTime() - 3 * 60 * 60 * 1_000);
    expect(lteBRT.toISOString().startsWith("2026-06-22")).toBe(true);
  });

  it("excludes cancelled appointments", async () => {
    await getAgendaWeek("2026-06-16");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { status: { notIn: string[] } };
    };
    expect(arg.where.status.notIn).toContain("cancelled");
  });
});

describe("getAgendaWeek — appointment grouping by BRT dateKey", () => {
  it("groups an appointment into its correct BRT day bucket", async () => {
    // 2026-06-17T10:00:00Z = 07:00 BRT (UTC-3) → dateKey "2026-06-17"
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      makeAppointment("2026-06-17T10:00:00.000Z"),
    ] as never);

    const result = await getAgendaWeek("2026-06-16");
    expect(result.appointmentsByDay["2026-06-17"]).toHaveLength(1);
    expect(result.appointmentsByDay["2026-06-16"]).toHaveLength(0);
  });

  it("correctly handles UTC midnight boundary (22:00 UTC previous day = 19:00 BRT same day)", async () => {
    // 2026-06-17T22:00:00Z = 19:00 BRT → dateKey "2026-06-17"
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      makeAppointment("2026-06-17T22:00:00.000Z"),
    ] as never);

    const result = await getAgendaWeek("2026-06-16");
    expect(result.appointmentsByDay["2026-06-17"]).toHaveLength(1);
  });

  it("multiple appointments on different days land in correct buckets", async () => {
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      makeAppointment("2026-06-16T12:00:00.000Z"),
      makeAppointment("2026-06-18T12:00:00.000Z"),
      makeAppointment("2026-06-18T15:00:00.000Z"),
      makeAppointment("2026-06-22T09:00:00.000Z"),
    ] as never);

    const result = await getAgendaWeek("2026-06-16");
    expect(result.appointmentsByDay["2026-06-16"]).toHaveLength(1);
    expect(result.appointmentsByDay["2026-06-18"]).toHaveLength(2);
    expect(result.appointmentsByDay["2026-06-22"]).toHaveLength(1);
    expect(result.appointmentsByDay["2026-06-17"]).toHaveLength(0);
  });
});

describe("getAgendaWeek — businessHours", () => {
  it("returns businessHours keyed by dayOfWeek", async () => {
    vi.mocked(db.businessHour.findMany).mockResolvedValue([
      { dayOfWeek: 1, openTime: "09:00", closeTime: "19:00", isOpen: true },
      { dayOfWeek: 6, openTime: "09:00", closeTime: "14:00", isOpen: true },
      { dayOfWeek: 0, openTime: "09:00", closeTime: "12:00", isOpen: false },
    ] as never);

    const result = await getAgendaWeek("2026-06-16");
    expect(result.businessHours[1]).toEqual({
      openTime: "09:00",
      closeTime: "19:00",
      isOpen: true,
    });
    expect(result.businessHours[6].closeTime).toBe("14:00");
    expect(result.businessHours[0].isOpen).toBe(false);
  });

  it("returns empty businessHours when none configured", async () => {
    const result = await getAgendaWeek("2026-06-16");
    expect(result.businessHours).toEqual({});
  });
});

describe("getAgendaWeek — RBAC", () => {
  it("applies appointmentScope to the query", async () => {
    await getAgendaWeek("2026-06-16");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { barbershopId: string };
    };
    expect(arg.where.barbershopId).toBe(SHOP_ID);
  });
});
