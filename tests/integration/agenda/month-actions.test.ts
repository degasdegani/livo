/**
 * Tests for getAgendaMonthSummary (agenda-actions.ts)
 *
 * Verifies:
 *   - Single appointment query for the full month (no N+1)
 *   - Correct projection (date, id, clientName)
 *   - cancelled/no_show excluded
 *   - appointmentScope RBAC applied
 *   - Appointments grouped correctly by BRT dateKey
 *   - UTC midnight boundary handled correctly
 *   - daysSummary includes count + appointments array
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import { appointmentScope, requireMembership } from "@/lib/permissions";
import { getAgendaMonthSummary } from "@/app/(dashboard)/dashboard/agenda/agenda-actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    appointment: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  appointmentScope: vi.fn(),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-month-test";

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

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(membership() as never);
  vi.mocked(appointmentScope).mockReturnValue({ barbershopId: SHOP_ID } as never);
  vi.mocked(db.appointment.findMany).mockResolvedValue([]);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getAgendaMonthSummary — query shape", () => {
  it("makes exactly 1 appointment query for the full month", async () => {
    await getAgendaMonthSummary("2026-06-01");
    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledTimes(1);
  });

  it("excludes cancelled and no_show appointments", async () => {
    await getAgendaMonthSummary("2026-06-01");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { status: { notIn: string[] } };
    };
    expect(arg.where.status.notIn).toContain("cancelled");
    expect(arg.where.status.notIn).toContain("no_show");
  });

  it("applies appointmentScope (RBAC)", async () => {
    await getAgendaMonthSummary("2026-06-01");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { barbershopId: string };
    };
    expect(arg.where.barbershopId).toBe(SHOP_ID);
  });

  it("query range starts on the first of the month (BRT)", async () => {
    await getAgendaMonthSummary("2026-06-01");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    // 2026-06-01T00:00:00-03:00 = 2026-06-01T03:00:00.000Z
    expect(arg.where.date.gte.toISOString()).toContain("2026-06-01");
  });

  it("query range ends on the last day of the month (BRT)", async () => {
    await getAgendaMonthSummary("2026-06-01");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    // 2026-06-30T23:59:59.999-03:00 → UTC rolls into July 1
    const lteBRT = new Date(arg.where.date.lte.getTime() - 3 * 60 * 60 * 1_000);
    expect(lteBRT.toISOString().startsWith("2026-06-30")).toBe(true);
  });

  it("handles 31-day months (July) correctly", async () => {
    await getAgendaMonthSummary("2026-07-01");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    const lteBRT = new Date(arg.where.date.lte.getTime() - 3 * 60 * 60 * 1_000);
    expect(lteBRT.toISOString().startsWith("2026-07-31")).toBe(true);
  });

  it("handles 28-day month (February non-leap year) correctly", async () => {
    await getAgendaMonthSummary("2025-02-01");
    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    const lteBRT = new Date(arg.where.date.lte.getTime() - 3 * 60 * 60 * 1_000);
    expect(lteBRT.toISOString().startsWith("2025-02-28")).toBe(true);
  });
});

describe("getAgendaMonthSummary — daysSummary grouping", () => {
  it("returns empty daysSummary when no appointments", async () => {
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary).toEqual({});
  });

  it("counts a single appointment on the correct BRT day", async () => {
    // 2026-06-17T10:00:00Z = 07:00 BRT → "2026-06-17"
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { id: "appt-1", date: new Date("2026-06-17T10:00:00.000Z"), clientName: "João" } as never,
    ]);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-17"].count).toBe(1);
  });

  it("populates appointments array with id, time (BRT) and clientName", async () => {
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { id: "appt-1", date: new Date("2026-06-17T10:00:00.000Z"), clientName: "João" } as never,
    ]);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-17"].appointments).toHaveLength(1);
    expect(result.daysSummary["2026-06-17"].appointments[0]).toMatchObject({
      id: "appt-1",
      time: "07:00",
      clientName: "João",
    });
  });

  it("counts multiple appointments on the same day", async () => {
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { id: "a1", date: new Date("2026-06-17T09:00:00.000Z"), clientName: "A" } as never,
      { id: "a2", date: new Date("2026-06-17T11:00:00.000Z"), clientName: "B" } as never,
      { id: "a3", date: new Date("2026-06-17T15:00:00.000Z"), clientName: "C" } as never,
    ]);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-17"].count).toBe(3);
  });

  it("distributes appointments across multiple days", async () => {
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { id: "a1", date: new Date("2026-06-16T12:00:00.000Z"), clientName: "A" } as never,
      { id: "a2", date: new Date("2026-06-17T10:00:00.000Z"), clientName: "B" } as never,
      { id: "a3", date: new Date("2026-06-17T14:00:00.000Z"), clientName: "C" } as never,
      { id: "a4", date: new Date("2026-06-20T09:00:00.000Z"), clientName: "D" } as never,
    ]);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-16"].count).toBe(1);
    expect(result.daysSummary["2026-06-17"].count).toBe(2);
    expect(result.daysSummary["2026-06-20"].count).toBe(1);
    expect(result.daysSummary["2026-06-18"]).toBeUndefined();
  });

  it("handles BRT midnight boundary: 22:00 UTC prev day = 19:00 BRT same day", async () => {
    // 2026-06-17T22:00:00Z = 19:00 BRT → still "2026-06-17"
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { id: "a1", date: new Date("2026-06-17T22:00:00.000Z"), clientName: "X" } as never,
    ]);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-17"].count).toBe(1);
    expect(result.daysSummary["2026-06-18"]).toBeUndefined();
  });

  it("handles BRT midnight boundary: 03:00 UTC = 00:00 BRT (same day)", async () => {
    // 2026-06-18T03:00:00Z = 00:00 BRT on June 18 → "2026-06-18"
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { id: "a1", date: new Date("2026-06-18T03:00:00.000Z"), clientName: "X" } as never,
    ]);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-18"].count).toBe(1);
    expect(result.daysSummary["2026-06-17"]).toBeUndefined();
  });

  it("caps appointments array at 5 entries even when count is higher", async () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({
      id: `appt-${i}`,
      date: new Date(`2026-06-17T${String(8 + i).padStart(2, "0")}:00:00.000Z`),
      clientName: `Client ${i}`,
    }));
    vi.mocked(db.appointment.findMany).mockResolvedValue(rows as never);
    const result = await getAgendaMonthSummary("2026-06-01");
    expect(result.daysSummary["2026-06-17"].count).toBe(7);
    expect(result.daysSummary["2026-06-17"].appointments).toHaveLength(5);
  });
});
