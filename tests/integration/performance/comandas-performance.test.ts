/**
 * TEST-10 — Performance: Comandas
 *
 * Functions under test:
 *   getComandas    — take: 100 cap (bounded) but items: true has no select
 *   getComissoesData — date-bounded, NO take limit
 *
 * N+1 status: CLEAN — getComissoesData fetches all comandas in 1 query,
 *   then aggregates commission data in-memory.
 *
 * DOCUMENTED GARGALOS:
 *   1. getComandas — `items: true` fetches all ComandaItem fields (no select).
 *      With take:100 × avg 5 items each = 500 item rows, all fields included.
 *      Fix: add select to items (only type, totalInCents, commissionValue needed).
 *   2. getComissoesData — no take limit, relying on date range to bound results.
 *      High-volume shops (200+ comandas/month) → full month in memory.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComandaStatus, MemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import {
  getComandas,
  getComissoesData,
} from "@/app/(dashboard)/dashboard/comandas/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findMany: vi.fn() },
    professional: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    comanda: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-comanda-perf";

// ── Helpers ────────────────────────────────────────────────────────────────────

function membership(role = MemberRole.owner) {
  return {
    barbershopId: SHOP_ID,
    role,
    userId: "user-1",
    membershipId: "mem-1",
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
  };
}

function makeComanda(i: number, isClosed = false) {
  return {
    id: `comanda-${i}`,
    status: isClosed ? ComandaStatus.closed : ComandaStatus.open,
    barbershopId: SHOP_ID,
    professionalId: "prof-1",
    totalInCents: 5000 + i * 100,
    openedAt: new Date(),
    closedAt: isClosed ? new Date() : null,
    professional: { name: "Pedro" },
    client: { name: `Cliente ${i}` },
    items: Array.from({ length: 3 }, (_, j) => ({
      id: `item-${i}-${j}`,
      type: "service",
      serviceName: "Corte",
      productName: null,
      quantity: 1,
      totalInCents: 1500,
      commissionValue: 300,
      commissionOnService: true,
    })),
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(membership() as never);
  vi.mocked(db.comanda.findMany).mockResolvedValue([]);
  vi.mocked(db.professional.findMany).mockResolvedValue([]);
});

// ── getComandas — take limit ──────────────────────────────────────────────────

describe("getComandas — take: 100 limit", () => {
  it("always passes take: 100 to the query", async () => {
    await getComandas("abertas");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      take: number;
    };
    expect(arg.take).toBe(100);
  });

  it("take: 100 is applied for every filtro variant", async () => {
    for (const filtro of ["abertas", "hoje", "fechadas", "todas"] as const) {
      vi.clearAllMocks();
      vi.mocked(requireMembership).mockResolvedValue(membership() as never);
      vi.mocked(db.comanda.findMany).mockResolvedValue([]);

      await getComandas(filtro);

      const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
        take: number;
      };
      expect(arg.take).toBe(100);
    }
  });

  it("filtro=abertas sets where.status=open", async () => {
    await getComandas("abertas");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { status: string };
    };
    expect(arg.where.status).toBe(ComandaStatus.open);
  });

  it("filtro=fechadas sets where.status=closed", async () => {
    await getComandas("fechadas");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { status: string };
    };
    expect(arg.where.status).toBe(ComandaStatus.closed);
  });

  it("GARGALO: items fetched with include (no select) — all fields returned", async () => {
    await getComandas("abertas");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      include: { items: boolean | object };
    };
    // items: true = no select = all fields fetched
    expect(arg.include.items).toBe(true);
    // Document: add select to items to reduce payload
  });
});

// ── getComandas — high volume ─────────────────────────────────────────────────

describe("getComandas — high-volume dataset (100 × 3 items)", () => {
  it("handles 100 comandas with 3 items each without error", async () => {
    const comandas = Array.from({ length: 100 }, (_, i) => makeComanda(i));
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getComandas("abertas");

    expect(result).toHaveLength(100);
    expect(result[0].items).toHaveLength(3);
  });

  it("makes exactly 1 DB query (no per-comanda queries)", async () => {
    const comandas = Array.from({ length: 100 }, (_, i) => makeComanda(i));
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    await getComandas("abertas");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
  });
});

// ── getComissoesData — query bounds ──────────────────────────────────────────

describe("getComissoesData — date-bounded query", () => {
  it("scopes query to closedAt within the requested period", async () => {
    await getComissoesData("mes_atual");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { closedAt: { gte: Date; lte: Date }; status: string };
    };
    expect(arg.where.closedAt.gte).toBeInstanceOf(Date);
    expect(arg.where.closedAt.lte).toBeInstanceOf(Date);
    expect(arg.where.status).toBe(ComandaStatus.closed);
  });

  it("GARGALO: getComissoesData has no take limit — bounded only by date range", async () => {
    await getComissoesData("mes_atual");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    // Document: shops with 500+ comandas/month load everything into memory
    expect(arg).not.toHaveProperty("take");
  });

  it("ultimos_90 period spans approximately 90 days back", async () => {
    await getComissoesData("ultimos_90");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { closedAt: { gte: Date } };
    };
    const gte = arg.where.closedAt.gte;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const diffDays = Math.abs(
      (gte.getTime() - ninetyDaysAgo.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBeLessThan(2); // within 2 days of 90d ago
  });

  it("fetches professionals in a second query (not per-comanda)", async () => {
    const comandas = Array.from({ length: 50 }, (_, i) =>
      makeComanda(i, true),
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);
    vi.mocked(db.professional.findMany).mockResolvedValue([]);

    await getComissoesData("mes_atual");

    // Exactly 2 queries: findMany for comandas + findMany for professionals
    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.professional.findMany)).toHaveBeenCalledTimes(1);
  });
});

// ── getComissoesData — high-volume correctness ────────────────────────────────

describe("getComissoesData — in-memory commission aggregation at high volume", () => {
  it("aggregates commissions correctly for 200 comandas across 3 professionals", async () => {
    const profIds = ["prof-a", "prof-b", "prof-c"];
    const comandas = Array.from({ length: 200 }, (_, i) => ({
      id: `comanda-${i}`,
      professionalId: profIds[i % 3],
      totalInCents: 5000,
      closedAt: new Date(),
      professional: { id: profIds[i % 3], name: `Barb ${i % 3}` },
      items: [
        {
          type: "service",
          commissionValue: 1000, // R$10 per item
        },
      ],
    }));
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);
    vi.mocked(db.professional.findMany).mockResolvedValue(
      profIds.map((id, i) => ({ id, name: `Barb ${i}` })) as never,
    );

    const result = await getComissoesData("mes_atual");

    // Each professional has 200/3 ≈ 66-67 comandas
    expect(result.resumo).toHaveLength(3);
    const totalComissoes = result.resumo.reduce(
      (sum, r) => sum + r.totalComissao,
      0,
    );
    expect(totalComissoes).toBe(200_000); // 200 × 1000
  });
});
