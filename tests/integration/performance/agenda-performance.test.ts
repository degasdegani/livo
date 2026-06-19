/**
 * TEST-10 — Performance: Agenda
 *
 * Functions under test:
 *   getAgendaDay       — 2 queries: professional.findMany + appointment.findMany (day-scoped)
 *   getServicesForAgenda — 1 query: service.findMany (barbershop-scoped, no take)
 *   searchClientsForAgenda — 1 query: client.findMany (take: 8 limit)
 *
 * Visão mensal (agenda/page.tsx) — direct db.appointment.findMany:
 *   - 7-month window (3 prior + 4 future)
 *   - NO take limit — DOCUMENTED GARGALO for high-volume barbershops
 *
 * N+1 status: CLEAN — day view makes exactly 2 queries regardless of appointment count.
 *
 * DOCUMENTED GARGALO (monthly view in page.tsx):
 *   db.appointment.findMany with 7-month date range and no take limit.
 *   A shop with 60 appointments/day × 210 days = 12,600 records in memory.
 *   Fix: add take: 1000 + cursor-based pagination for calendar render.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import {
  appointmentScope,
  clientScope,
  requireMembership,
} from "@/lib/permissions";
import {
  getAgendaDay,
  getServicesForAgenda,
  searchClientsForAgenda,
} from "@/app/(dashboard)/dashboard/agenda/agenda-actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    professional: { findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    businessHour: { findFirst: vi.fn() },
    timeBlock: { findMany: vi.fn() },
    service: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  appointmentScope: vi.fn(),
  clientScope: vi.fn(),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-agenda-perf";

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function makeAppointment(i: number) {
  return {
    id: `appt-${i}`,
    date: new Date("2026-06-14T10:00:00Z"),
    endTime: new Date("2026-06-14T10:30:00Z"),
    status: "confirmed" as const,
    clientId: `client-${i}`,
    clientName: `Cliente ${i}`,
    clientPhone: null,
    notes: null,
    professionalId: "prof-1",
    serviceId: "svc-1",
    service: { name: "Corte", durationMin: 30, priceInCents: 3500 },
    comanda: null,
    services: [],
  };
}

function makeProfessional(i: number) {
  return { id: `prof-${i}`, name: `Barb ${i}`, avatarUrl: null };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(membership() as never);
  vi.mocked(appointmentScope).mockReturnValue({ barbershopId: SHOP_ID } as never);
  vi.mocked(clientScope).mockReturnValue({ barbershopId: SHOP_ID } as never);
  vi.mocked(db.professional.findMany).mockResolvedValue([]);
  vi.mocked(db.appointment.findMany).mockResolvedValue([]);
  vi.mocked(db.businessHour.findFirst).mockResolvedValue(null);
  vi.mocked(db.timeBlock.findMany).mockResolvedValue([]);
  vi.mocked(db.service.findMany).mockResolvedValue([]);
  vi.mocked(db.client.findMany).mockResolvedValue([]);
});

// ── getAgendaDay — query bounds ───────────────────────────────────────────────

describe("getAgendaDay — query bounds", () => {
  it("scopes appointment query to the requested date (gte/lte)", async () => {
    await getAgendaDay("2026-06-14");

    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    expect(arg.where.date.gte).toBeInstanceOf(Date);
    expect(arg.where.date.lte).toBeInstanceOf(Date);
    expect(arg.where.date.gte.toISOString().startsWith("2026-06-14")).toBe(true);
  });

  it("excludes cancelled appointments from the day query", async () => {
    await getAgendaDay("2026-06-14");

    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { status: { notIn: string[] } };
    };
    expect(arg.where.status.notIn).toContain("cancelled");
  });

  it("uses select on service fields (not full include)", async () => {
    await getAgendaDay("2026-06-14");

    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      include: { service: { select: object } };
    };
    expect(arg.include.service).toHaveProperty("select");
  });

  it("makes exactly 2 DB queries (professionals + appointments)", async () => {
    await getAgendaDay("2026-06-14");

    expect(vi.mocked(db.professional.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledTimes(1);
  });
});

// ── getAgendaDay — high volume ────────────────────────────────────────────────

describe("getAgendaDay — high volume (busy day)", () => {
  it("handles 50 appointments in a single day without error", async () => {
    const appts = Array.from({ length: 50 }, (_, i) => makeAppointment(i));
    const profs = Array.from({ length: 5 }, (_, i) => makeProfessional(i));
    vi.mocked(db.appointment.findMany).mockResolvedValue(appts as never);
    vi.mocked(db.professional.findMany).mockResolvedValue(profs as never);

    const result = await getAgendaDay("2026-06-14");

    expect(result.appointments).toHaveLength(50);
    expect(result.professionals).toHaveLength(5);
  });

  it("still makes exactly 2 DB queries with 50 appointments (no N+1)", async () => {
    const appts = Array.from({ length: 50 }, (_, i) => makeAppointment(i));
    vi.mocked(db.appointment.findMany).mockResolvedValue(appts as never);

    await getAgendaDay("2026-06-14");

    // No per-appointment queries
    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.professional.findMany)).toHaveBeenCalledTimes(1);
  });

  it("maps service fields from include without extra queries", async () => {
    const appts = Array.from({ length: 20 }, (_, i) => makeAppointment(i));
    vi.mocked(db.appointment.findMany).mockResolvedValue(appts as never);

    const result = await getAgendaDay("2026-06-14");

    // Each appointment should have service data resolved in-memory (no extra queries)
    expect(result.appointments[0].serviceName).toBe("Corte");
    expect(result.appointments[0].serviceDurationMin).toBe(30);
  });
});

// ── searchClientsForAgenda — pagination ──────────────────────────────────────

describe("searchClientsForAgenda — take limit", () => {
  it("applies take: 8 limit to client search", async () => {
    await searchClientsForAgenda("João");

    const arg = vi.mocked(db.client.findMany).mock.calls[0][0] as {
      take: number;
    };
    expect(arg.take).toBe(8);
  });

  it("applies DB-level OR filter (name/phone) — not in-memory filtering", async () => {
    await searchClientsForAgenda("pedro");

    const arg = vi.mocked(db.client.findMany).mock.calls[0][0] as {
      where: { OR: unknown[] };
    };
    expect(arg.where.OR).toBeDefined();
    expect(arg.where.OR.length).toBeGreaterThan(0);
  });

  it("returns empty array without querying DB when search is < 2 chars", async () => {
    const result = await searchClientsForAgenda("a");

    expect(result).toEqual([]);
    expect(vi.mocked(db.client.findMany)).not.toHaveBeenCalled();
  });

  it("returns empty array without DB query when search is empty", async () => {
    const result = await searchClientsForAgenda("");

    expect(result).toEqual([]);
    expect(vi.mocked(db.client.findMany)).not.toHaveBeenCalled();
  });
});

// ── getServicesForAgenda — query profile ──────────────────────────────────────

describe("getServicesForAgenda — query profile", () => {
  it("filters to active services only", async () => {
    await getServicesForAgenda();

    const arg = vi.mocked(db.service.findMany).mock.calls[0][0] as {
      where: { isActive: boolean };
    };
    expect(arg.where.isActive).toBe(true);
  });

  it("scoped to barbershopId", async () => {
    await getServicesForAgenda();

    const arg = vi.mocked(db.service.findMany).mock.calls[0][0] as {
      where: { barbershopId: string };
    };
    expect(arg.where.barbershopId).toBe(SHOP_ID);
  });
});
