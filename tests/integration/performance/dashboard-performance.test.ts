/**
 * TEST-10 — Performance: Dashboard Analytics
 *
 * getDashboardAnalytics (src/app/(dashboard)/dashboard/actions.ts)
 *
 * Query profile: 1 db.comanda.findMany scoped to last 12 months.
 *
 * DOCUMENTED GARGALO: no `take:` limit — large tenants with 10k+ comandas/year
 *   will load the entire set into memory for JS aggregation.
 *   Fix: use db.comanda.groupBy + db.comanda.aggregate at DB level.
 *
 * Tests verify:
 *   - Query is date-bounded (closedAt ≥ ~12 months ago)
 *   - Query uses `select:` (not full object fetch)
 *   - No take limit exists (documents the gargalo)
 *   - In-memory aggregation is correct at high volume (1000+ comandas)
 *   - Monthly evolution covers all 12 slots regardless of gaps
 *   - Top services capped at 5 even when more services exist
 *   - Barber ranking aggregated from same in-memory dataset (no extra query)
 *   - Empty dataset returns safe zero values (no NaN / divide-by-zero)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { getDashboardAnalytics } from "@/app/(dashboard)/dashboard/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: { comanda: { findMany: vi.fn() } },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-dash-perf";

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

const now = new Date();
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const thisMonthMid = new Date(now.getFullYear(), now.getMonth(), 15);
const lastMonthMid = new Date(now.getFullYear(), now.getMonth() - 1, 15);

function makeComanda(opts: {
  closedAt?: Date;
  totalInCents?: number;
  professionalName?: string;
  services?: { name: string; qty: number; cents: number }[];
}) {
  const {
    closedAt = thisMonthMid,
    totalInCents = 5000,
    professionalName = "Pedro",
    services = [],
  } = opts;
  return {
    totalInCents,
    closedAt,
    professional: { name: professionalName },
    items: services.map((s) => ({
      type: "service" as const,
      serviceName: s.name,
      quantity: s.qty,
      totalInCents: s.cents,
    })),
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(membership() as never);
  vi.mocked(db.comanda.findMany).mockResolvedValue([]);
});

// ── Query bounds ──────────────────────────────────────────────────────────────

describe("Query bounds — date range and select", () => {
  it("scopes query to closedAt >= ~12 months ago", async () => {
    await getDashboardAnalytics();

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { closedAt: { gte: Date } };
    };
    const gte = arg.where.closedAt.gte;

    expect(gte).toBeInstanceOf(Date);
    // Must be roughly 12 months ago (within ±1 month tolerance)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const diff = Math.abs(gte.getTime() - twelveMonthsAgo.getTime());
    const oneMonth = 31 * 24 * 60 * 60 * 1000;
    expect(diff).toBeLessThan(oneMonth);
  });

  it("filters by barbershopId", async () => {
    await getDashboardAnalytics();

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { barbershopId: string };
    };
    expect(arg.where.barbershopId).toBe(SHOP_ID);
  });

  it("filters by status=closed", async () => {
    await getDashboardAnalytics();

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { status: string };
    };
    expect(arg.where.status).toBe("closed");
  });

  it("uses select (not include) — fetches only needed fields", async () => {
    await getDashboardAnalytics();

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    expect(arg).toHaveProperty("select");
    expect(arg).not.toHaveProperty("include");
  });

  it("GARGALO: no take limit — entire 12-month dataset loaded into memory", async () => {
    await getDashboardAnalytics();

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    // Document: no take means potentially 10k+ records at scale
    expect(arg).not.toHaveProperty("take");
  });

  it("makes exactly 1 DB query (all aggregations done in JS)", async () => {
    await getDashboardAnalytics();

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
  });
});

// ── High-volume correctness ───────────────────────────────────────────────────

describe("High-volume correctness — 1 000+ comandas", () => {
  it("correctly sums faturamentoMes for 1000 current-month comandas", async () => {
    const comandas = Array.from({ length: 1000 }, () =>
      makeComanda({ closedAt: thisMonthMid, totalInCents: 3500 }),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getDashboardAnalytics();

    expect(result.faturamentoMes).toBe(3_500_000); // 1000 × 3500
    expect(result.totalComandasMes).toBe(1000);
    expect(result.ticketMedio).toBe(3500);
  });

  it("separates current-month vs prior-month comandas correctly", async () => {
    const comandas = [
      ...Array.from({ length: 600 }, () =>
        makeComanda({ closedAt: thisMonthMid, totalInCents: 5000 }),
      ),
      ...Array.from({ length: 400 }, () =>
        makeComanda({ closedAt: lastMonthMid, totalInCents: 5000 }),
      ),
    ];
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getDashboardAnalytics();

    expect(result.totalComandasMes).toBe(600);
    expect(result.faturamentoMes).toBe(3_000_000);
  });

  it("evolucaoMensal always has exactly 12 entries", async () => {
    const comandas = Array.from({ length: 500 }, () =>
      makeComanda({ closedAt: thisMonthMid }),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getDashboardAnalytics();

    expect(result.evolucaoMensal).toHaveLength(12);
  });

  it("topServicos capped at 5 even when 20+ distinct services exist", async () => {
    const comandas = Array.from({ length: 200 }, (_, i) =>
      makeComanda({
        closedAt: thisMonthMid,
        services: [{ name: `Serviço ${i % 20}`, qty: 1, cents: 2000 }],
      }),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getDashboardAnalytics();

    expect(result.topServicos.length).toBeLessThanOrEqual(5);
  });

  it("rankingBarbeiros aggregated from the same dataset without extra DB query", async () => {
    const comandas = [
      ...Array.from({ length: 300 }, () =>
        makeComanda({ closedAt: thisMonthMid, totalInCents: 4000, professionalName: "Pedro" }),
      ),
      ...Array.from({ length: 200 }, () =>
        makeComanda({ closedAt: thisMonthMid, totalInCents: 3000, professionalName: "João" }),
      ),
    ];
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getDashboardAnalytics();

    // Only 1 DB call total (no extra query for barber ranking)
    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
    expect(result.rankingBarbeiros[0].nome).toBe("Pedro");
    expect(result.rankingBarbeiros[0].faturamento).toBe(1_200_000);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("Edge cases — empty dataset and zero division", () => {
  it("returns zero values (no NaN) when no comandas exist", async () => {
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    const result = await getDashboardAnalytics();

    expect(result.faturamentoMes).toBe(0);
    expect(result.totalComandasMes).toBe(0);
    expect(result.ticketMedio).toBe(0);
    expect(Number.isNaN(result.ticketMedio)).toBe(false);
  });

  it("fills zero for months with no activity in evolucaoMensal", async () => {
    // Single comanda this month — all other months should be 0
    vi.mocked(db.comanda.findMany).mockResolvedValue([
      makeComanda({ closedAt: thisMonthMid, totalInCents: 9999 }),
    ] as never);

    const result = await getDashboardAnalytics();

    const zeroMonths = result.evolucaoMensal.filter((m) => m.totalInCents === 0);
    expect(zeroMonths.length).toBe(11); // 12 months total - 1 with data
    const activeMonth = result.evolucaoMensal.find((m) => m.totalInCents > 0);
    expect(activeMonth?.totalInCents).toBe(9999);
  });

  it("ticketMedio is rounded (no fractional cents)", async () => {
    // 3 comandas totaling 10001 cents → ticketMedio = round(10001/3) = 3334
    const comandas = [
      makeComanda({ closedAt: thisMonthMid, totalInCents: 3334 }),
      makeComanda({ closedAt: thisMonthMid, totalInCents: 3334 }),
      makeComanda({ closedAt: thisMonthMid, totalInCents: 3333 }),
    ];
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getDashboardAnalytics();

    expect(Number.isInteger(result.ticketMedio)).toBe(true);
    expect(result.ticketMedio).toBeGreaterThan(0);
  });
});
