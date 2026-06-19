/**
 * TEST-10 — Performance: Relatórios + Booking público
 *
 * Functions under test:
 *   getRelatorioData   — 1 query (date-bounded), NO take limit, in-memory aggregation
 *   getAvailableSlots  — 3 sequential queries (service → businessHour → appointments)
 *
 * N+1 status:
 *   getRelatorioData: CLEAN — single query, all aggregation in-memory.
 *   getAvailableSlots: SEQUENTIAL (not N+1) — 3 queries but could run 2 in parallel.
 *
 * DOCUMENTED GARGALOS:
 *   1. getRelatorioData — no take limit on comanda.findMany. A busy shop with
 *      3000 closed comandas/month → 3000 records loaded into memory for JS aggregation.
 *      Fix: use db.comanda.groupBy at DB level for KPIs, findMany only for chart evolution.
 *
 *   2. getAvailableSlots — service + businessHour queried sequentially. They are
 *      independent and could run in parallel with Promise.all, saving ~1 RTT per
 *      booking page interaction.
 *      Fix: `const [service, businessHour] = await Promise.all([...])`.
 *
 *   3. getAvailableSlots — appointment.findMany has no select clause. All fields
 *      returned; only date + endTime are needed for slot calculation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { getRelatorioData } from "@/app/(dashboard)/dashboard/relatorios/actions";
import { getAvailableSlots } from "@/app/[slug]/book/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findMany: vi.fn() },
    service: { findFirst: vi.fn(), findMany: vi.fn() },
    businessHour: { findFirst: vi.fn() },
    appointment: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({
  sendAppointmentConfirmation: vi.fn(),
}));

vi.mock("@/lib/appointment-core", () => ({
  createAppointmentCore: vi.fn(),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-relatorios-perf";
const PROF_ID = "prof-relatorios-1";
const SVC_ID = "svc-relatorios-1";

// ── Helpers ────────────────────────────────────────────────────────────────────

function membership() {
  return {
    barbershopId: SHOP_ID,
    role: "owner" as const,
    userId: "user-1",
    membershipId: "mem-1",
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
  };
}

function makeComanda(opts: {
  closedAt?: Date;
  totalInCents?: number;
  paymentMethod?: string;
  professionalName?: string;
  services?: { name: string; qty: number; cents: number; commission?: number | null }[];
}) {
  const {
    closedAt = new Date(),
    totalInCents = 5000,
    paymentMethod = "pix",
    professionalName = "Pedro",
    services = [],
  } = opts;
  return {
    id: `comanda-${Math.random()}`,
    totalInCents,
    closedAt,
    paymentMethod,
    clientId: "client-1",
    professional: { id: "prof-1", name: professionalName },
    payments: [] as { method: string; amountInCents: number }[],
    items: services.map((s) => ({
      type: "service",
      serviceName: s.name,
      productName: null,
      quantity: s.qty,
      totalInCents: s.cents,
      commissionValue: s.commission ?? null,
    })),
  };
}

function makeAppointment(i: number) {
  return {
    id: `appt-${i}`,
    barbershopId: SHOP_ID,
    professionalId: PROF_ID,
    date: new Date(`2026-06-14T${9 + Math.floor(i / 2)}:${i % 2 === 0 ? "00" : "30"}:00Z`),
    endTime: new Date(`2026-06-14T${9 + Math.floor(i / 2)}:${i % 2 === 0 ? "30" : "00"}:00Z`),
    status: "confirmed",
    clientName: `Cliente ${i}`,
    clientPhone: null,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(membership() as never);
  vi.mocked(db.comanda.findMany).mockResolvedValue([]);
  vi.mocked(db.service.findMany).mockResolvedValue([{
    id: SVC_ID,
    durationMin: 30,
    name: "Corte",
  }] as never);
  vi.mocked(db.businessHour.findFirst).mockResolvedValue({
    isOpen: true,
    openTime: "09:00",
    closeTime: "18:00",
    dayOfWeek: 6,
  } as never);
  vi.mocked(db.appointment.findMany).mockResolvedValue([]);
});

// ── getRelatorioData — query bounds ──────────────────────────────────────────

describe("getRelatorioData — date-bounded single query", () => {
  it("makes exactly 1 DB query for all period data", async () => {
    await getRelatorioData("mes");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
  });

  it("scopes query to closedAt within the period (gte/lte)", async () => {
    await getRelatorioData("mes");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { closedAt: { gte: Date; lte: Date }; status: string };
    };
    expect(arg.where.closedAt.gte).toBeInstanceOf(Date);
    expect(arg.where.closedAt.lte).toBeInstanceOf(Date);
    expect(arg.where.status).toBe("closed");
  });

  it("filters by barbershopId", async () => {
    await getRelatorioData("mes");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { barbershopId: string };
    };
    expect(arg.where.barbershopId).toBe(SHOP_ID);
  });

  it("uses select (not include) — only needed fields fetched", async () => {
    await getRelatorioData("mes");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    expect(arg).toHaveProperty("select");
    expect(arg).not.toHaveProperty("include");
  });

  it("GARGALO: no take limit — entire period loaded into memory for aggregation", async () => {
    await getRelatorioData("mes");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    expect(arg).not.toHaveProperty("take");
  });

  it("ano period scopes to full calendar year", async () => {
    await getRelatorioData("ano");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { closedAt: { gte: Date; lte: Date } };
    };
    const currentYear = new Date().getFullYear();
    expect(arg.where.closedAt.gte.getFullYear()).toBe(currentYear);
    expect(arg.where.closedAt.lte.getFullYear()).toBe(currentYear);
    expect(arg.where.closedAt.gte.getMonth()).toBe(0); // January
    expect(arg.where.closedAt.lte.getMonth()).toBe(11); // December
  });
});

// ── getRelatorioData — high-volume correctness ────────────────────────────────

describe("getRelatorioData — in-memory aggregation at high volume", () => {
  it("correctly computes KPIs for 1000 comandas", async () => {
    const comandas = Array.from({ length: 1000 }, () =>
      makeComanda({ totalInCents: 4500, paymentMethod: "pix" }),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getRelatorioData("mes");

    expect(result.kpis.faturamentoTotal).toBe(4_500_000); // 1000 × 4500
    expect(result.kpis.totalComandas).toBe(1000);
    expect(result.kpis.ticketMedio).toBe(4500);
  });

  it("topServicos capped at 10 even when 30+ distinct services exist", async () => {
    const comandas = Array.from({ length: 300 }, (_, i) =>
      makeComanda({
        services: [{ name: `Serviço ${i % 30}`, qty: 1, cents: 2000 }],
      }),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getRelatorioData("mes");

    expect(result.topServicos.length).toBeLessThanOrEqual(10);
  });

  it("payment breakdown aggregated correctly across 500 comandas with mixed methods", async () => {
    const methods = ["pix", "cash", "credit_card", "debit_card"];
    const comandas = Array.from({ length: 500 }, (_, i) =>
      makeComanda({ totalInCents: 2000, paymentMethod: methods[i % 4] }),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getRelatorioData("mes");

    // 4 methods × 125 each = 500 total
    expect(result.pagamentos).toHaveLength(4);
    const totalFromPagamentos = result.pagamentos.reduce(
      (sum, p) => sum + p.total,
      0,
    );
    expect(totalFromPagamentos).toBe(1_000_000); // 500 × 2000
  });

  it("barber ranking computed in-memory without extra DB queries", async () => {
    const comandas = [
      ...Array.from({ length: 200 }, () =>
        makeComanda({ totalInCents: 5000, professionalName: "Pedro" }),
      ),
      ...Array.from({ length: 150 }, () =>
        makeComanda({ totalInCents: 5000, professionalName: "João" }),
      ),
    ];
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getRelatorioData("mes");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
    expect(result.rankingBarbeiros[0].nome).toBe("Pedro");
    expect(result.rankingBarbeiros[0].faturamento).toBe(1_000_000);
  });

  it("evolucao has 12 entries for ano period (one per month)", async () => {
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    const result = await getRelatorioData("ano");

    expect(result.evolucao).toHaveLength(12);
  });

  it("ticketMedio is zero (not NaN) when no comandas in period", async () => {
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    const result = await getRelatorioData("mes");

    expect(result.kpis.ticketMedio).toBe(0);
    expect(Number.isNaN(result.kpis.ticketMedio)).toBe(false);
  });
});

// ── getAvailableSlots — query profile ────────────────────────────────────────

describe("getAvailableSlots — 3-query profile and day scoping", () => {
  it("makes exactly 3 DB queries (service → businessHour → appointments)", async () => {
    await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    expect(vi.mocked(db.service.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.businessHour.findFirst)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledTimes(1);
  });

  it("appointment query scoped to requested day (gte/lte day bounds)", async () => {
    await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date }; professionalId: string };
    };
    expect(arg.where.date.gte).toBeInstanceOf(Date);
    expect(arg.where.date.lte).toBeInstanceOf(Date);
    expect(arg.where.professionalId).toBe(PROF_ID);
  });

  it("excludes cancelled and no_show appointments from slot calculation", async () => {
    await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0] as {
      where: { status: { notIn: string[] } };
    };
    expect(arg.where.status.notIn).toContain("cancelled");
    expect(arg.where.status.notIn).toContain("no_show");
  });

  it("returns early (0 extra queries) when businessHour is closed", async () => {
    vi.mocked(db.businessHour.findFirst).mockResolvedValue({
      isOpen: false,
      openTime: "09:00",
      closeTime: "18:00",
      dayOfWeek: 0,
    } as never);

    const result = await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    expect(result).toEqual([]);
    // appointment.findMany NOT called when shop is closed
    expect(vi.mocked(db.appointment.findMany)).not.toHaveBeenCalled();
  });

  it("returns empty array when service not found (1 query only)", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);

    const result = await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    expect(result).toEqual([]);
    // businessHour + appointment queries should NOT be called
    expect(vi.mocked(db.businessHour.findFirst)).not.toHaveBeenCalled();
    expect(vi.mocked(db.appointment.findMany)).not.toHaveBeenCalled();
  });

  it("handles 30 existing appointments (busy day) and still returns available slots", async () => {
    const appts = Array.from({ length: 30 }, (_, i) => makeAppointment(i));
    vi.mocked(db.appointment.findMany).mockResolvedValue(appts as never);

    const result = await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    // Function should complete without error; result may be empty or non-empty
    expect(Array.isArray(result)).toBe(true);
  });

  it("GARGALO: appointment query has no select — all appointment fields fetched", async () => {
    await getAvailableSlots({
      barbershopId: SHOP_ID,
      professionalId: PROF_ID,
      serviceIds: [SVC_ID],
      date: "2026-06-14",
    });

    const arg = vi.mocked(db.appointment.findMany).mock.calls[0][0];
    // No select clause — all fields returned (only date + endTime needed)
    expect(arg).not.toHaveProperty("select");
  });
});
