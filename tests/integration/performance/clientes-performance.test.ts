/**
 * TEST-10 — Performance: Clientes + Client Intelligence
 *
 * Functions under test:
 *   getClientsData          — CRITICAL GARGALO: no take limit, no pagination
 *   getClientStats          — 3 parallel queries (client.count ×2 + $queryRaw)
 *   getClientIntelligence   — 3 total DB queries for N clients (not N+1)
 *   getReativacaoSugestoes  — 2 queries: client.findMany + comanda.groupBy
 *   getAgendaIntelligence   — 1 query: comanda.findMany (date-bounded)
 *
 * DOCUMENTED GARGALOS:
 *   1. getClientsData — db.client.findMany with NO take limit. A barbershop
 *      with 2000+ clients scans the full table. No pagination support.
 *      Fix: add take/skip parameters + cursor-based pagination.
 *   2. getClientIntelligence — db.client.findMany with NO take limit.
 *      Classification loop runs in O(N) memory. Acceptable up to ~5000 clients.
 *
 * N+1 verification:
 *   getClientIntelligence makes exactly 3 DB calls regardless of client count:
 *     1. client.findMany (get all clients)
 *     2. comanda.groupBy (batch revenue by clientId)
 *     3. comanda.findMany with distinct:["clientId"] (first comanda per multi-visit client)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  clientScope,
  requireMembership,
} from "@/lib/permissions";
import {
  getClientsData,
  getClientStats,
} from "@/app/(dashboard)/dashboard/clients/actions";
import {
  getClientIntelligence,
  getAgendaIntelligence,
  getReativacaoSugestoes,
} from "@/app/(dashboard)/dashboard/analytics/client-intelligence";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    client: { findMany: vi.fn(), count: vi.fn() },
    comanda: { findMany: vi.fn(), groupBy: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  clientScope: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-clientes-perf";

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

function makeClient(i: number, overrides: Partial<{
  bloqueado: boolean;
  totalVisits: number;
  lastVisitAt: Date | null;
}> = {}) {
  return {
    id: `client-${i}`,
    name: `Cliente ${i}`,
    phone: `119000${i.toString().padStart(5, "0")}`,
    email: null,
    cpf: null,
    birthDate: null,
    origem: null,
    bloqueado: false,
    totalVisits: 3,
    lastVisitAt: new Date(Date.now() - 15 * 86_400_000), // 15 days ago
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(membership() as never);
  vi.mocked(clientScope).mockReturnValue({ barbershopId: SHOP_ID } as never);
  vi.mocked(db.client.findMany).mockResolvedValue([]);
  vi.mocked(db.client.count).mockResolvedValue(0);
  vi.mocked(db.comanda.findMany).mockResolvedValue([]);
  vi.mocked(db.comanda.groupBy).mockResolvedValue([]);
  vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(0) }]);
});

// ── getClientsData — query profile ────────────────────────────────────────────

describe("getClientsData — query profile", () => {
  it("scopes query to barbershopId", async () => {
    await getClientsData();

    const arg = vi.mocked(db.client.findMany).mock.calls[0][0] as {
      where: { barbershopId: string };
    };
    expect(arg.where.barbershopId).toBe(SHOP_ID);
  });

  it("CRITICAL GARGALO: no take limit — full table scan on large barbershops", async () => {
    await getClientsData();

    const arg = vi.mocked(db.client.findMany).mock.calls[0][0];
    // Document: shops with 2000+ clients will load full table
    expect(arg).not.toHaveProperty("take");
    expect(arg).not.toHaveProperty("skip");
  });

  it("search filter applied at DB level via OR (not in-memory)", async () => {
    await getClientsData({ search: "João" });

    const arg = vi.mocked(db.client.findMany).mock.calls[0][0] as {
      where: { OR?: unknown[] };
    };
    expect(arg.where.OR).toBeDefined();
    expect(Array.isArray(arg.where.OR)).toBe(true);
  });

  it("handles 1000 clients returned from DB without error", async () => {
    const clients = Array.from({ length: 1000 }, (_, i) => makeClient(i));
    vi.mocked(db.client.findMany).mockResolvedValue(clients as never);

    const result = await getClientsData();

    expect(result).toHaveLength(1000);
  });

  it("makes exactly 1 DB query for standard list (no N+1)", async () => {
    await getClientsData();

    expect(vi.mocked(db.client.findMany)).toHaveBeenCalledTimes(1);
  });
});

// ── getClientStats — parallel queries ─────────────────────────────────────────

describe("getClientStats — 3 parallel queries (not sequential)", () => {
  it("calls client.count for total clients", async () => {
    vi.mocked(db.client.count).mockResolvedValue(250);
    vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(12) }]);

    const result = await getClientStats();

    expect(result.total).toBe(250);
    expect(vi.mocked(db.client.count)).toHaveBeenCalledTimes(2); // total + bloqueados
  });

  it("calls client.count for blocked clients", async () => {
    vi.mocked(db.client.count).mockResolvedValue(5);
    vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(0) }]);

    const result = await getClientStats();

    const blockedCall = vi.mocked(db.client.count).mock.calls.find(
      ([arg]) => (arg as { where: { bloqueado?: boolean } }).where.bloqueado === true,
    );
    expect(blockedCall).toBeDefined();
    expect(result.bloqueados).toBe(5);
  });

  it("uses $queryRaw for birthday count (EXTRACT not supported in Prisma ORM)", async () => {
    vi.mocked(db.client.count).mockResolvedValue(100);
    vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(8) }]);

    const result = await getClientStats();

    expect(vi.mocked(db.$queryRaw)).toHaveBeenCalledTimes(1);
    expect(result.aniversariantesMes).toBe(8);
  });

  it("returns zero aniversariantesMes when $queryRaw returns 0", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(0) }]);

    const result = await getClientStats();

    expect(result.aniversariantesMes).toBe(0);
    expect(Number.isNaN(result.aniversariantesMes)).toBe(false);
  });
});

// ── getClientIntelligence — N+1 prevention ────────────────────────────────────

describe("getClientIntelligence — N+1 prevention", () => {
  it("makes exactly 3 DB queries for 100 clients (not 100+2)", async () => {
    const clients = Array.from({ length: 100 }, (_, i) => makeClient(i));
    vi.mocked(db.client.findMany).mockResolvedValue(clients as never);
    vi.mocked(db.comanda.groupBy).mockResolvedValue([]);
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    await getClientIntelligence(SHOP_ID);

    expect(vi.mocked(db.client.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.comanda.groupBy)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
  });

  it("uses groupBy with IN clause for revenue — not per-client queries", async () => {
    const clients = Array.from({ length: 50 }, (_, i) => makeClient(i));
    vi.mocked(db.client.findMany).mockResolvedValue(clients as never);

    await getClientIntelligence(SHOP_ID);

    const groupByArg = vi.mocked(db.comanda.groupBy).mock.calls[0][0] as {
      by: string[];
      where: { clientId: { in: string[] } };
    };
    expect(groupByArg.by).toContain("clientId");
    expect(groupByArg.where.clientId.in).toHaveLength(50);
  });

  it("early exit with 0 DB queries after client.findMany when no clients exist", async () => {
    vi.mocked(db.client.findMany).mockResolvedValue([]);

    const result = await getClientIntelligence(SHOP_ID);

    // groupBy and findMany for comandas should NOT be called
    expect(vi.mocked(db.comanda.groupBy)).not.toHaveBeenCalled();
    expect(vi.mocked(db.comanda.findMany)).not.toHaveBeenCalled();
    expect(result.totais.total).toBe(0);
  });

  it("handles 500 clients without error and classifies all of them", async () => {
    const clients = Array.from({ length: 500 }, (_, i) =>
      makeClient(i, { lastVisitAt: new Date(Date.now() - (i % 90) * 86_400_000) }),
    );
    vi.mocked(db.client.findMany).mockResolvedValue(clients as never);
    vi.mocked(db.comanda.groupBy).mockResolvedValue(
      clients.map((c) => ({
        clientId: c.id,
        _sum: { totalInCents: 15000 },
      })) as never,
    );
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    const result = await getClientIntelligence(SHOP_ID);

    expect(result.totais.total).toBe(500);
    expect(result.totais.ativos + result.totais.emRisco + result.totais.inativos).toBe(500);
    // taxaAtividade must be a valid integer 0-100
    expect(result.totais.taxaAtividade).toBeGreaterThanOrEqual(0);
    expect(result.totais.taxaAtividade).toBeLessThanOrEqual(100);
  });

  it("GARGALO: getClientIntelligence has no take limit on clients", async () => {
    vi.mocked(db.client.findMany).mockResolvedValue([]);

    await getClientIntelligence(SHOP_ID);

    const arg = vi.mocked(db.client.findMany).mock.calls[0][0];
    expect(arg).not.toHaveProperty("take");
  });
});

// ── getReativacaoSugestoes — batched revenue ──────────────────────────────────

describe("getReativacaoSugestoes — grouped revenue (no N+1)", () => {
  it("uses single groupBy for revenue across all inactive clients", async () => {
    const clients = Array.from({ length: 80 }, (_, i) =>
      makeClient(i, { lastVisitAt: new Date(Date.now() - 45 * 86_400_000) }),
    );
    vi.mocked(db.client.findMany).mockResolvedValue(clients as never);
    vi.mocked(db.comanda.groupBy).mockResolvedValue([]);

    await getReativacaoSugestoes(SHOP_ID);

    expect(vi.mocked(db.comanda.groupBy)).toHaveBeenCalledTimes(1);
    const groupByArg = vi.mocked(db.comanda.groupBy).mock.calls[0][0] as {
      where: { clientId: { in: string[] } };
    };
    expect(groupByArg.where.clientId.in).toHaveLength(80);
  });

  it("early exit when no inactive clients exist (0 groupBy calls)", async () => {
    vi.mocked(db.client.findMany).mockResolvedValue([]);

    const result = await getReativacaoSugestoes(SHOP_ID);

    expect(vi.mocked(db.comanda.groupBy)).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("respects the limite parameter — caps returned suggestions", async () => {
    const clients = Array.from({ length: 50 }, (_, i) =>
      makeClient(i, {
        totalVisits: 2,
        lastVisitAt: new Date(Date.now() - 45 * 86_400_000),
      }),
    );
    vi.mocked(db.client.findMany).mockResolvedValue(clients as never);
    vi.mocked(db.comanda.groupBy).mockResolvedValue([]);

    const result = await getReativacaoSugestoes(SHOP_ID, { risco: 30, inativo: 60 }, 10);

    expect(result.length).toBeLessThanOrEqual(10);
  });
});

// ── getAgendaIntelligence — single query ──────────────────────────────────────

describe("getAgendaIntelligence — single bounded query", () => {
  it("makes exactly 1 DB query for period analysis", async () => {
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    await getAgendaIntelligence(SHOP_ID, "mes");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
  });

  it("scopes query to closedAt within the period", async () => {
    vi.mocked(db.comanda.findMany).mockResolvedValue([]);

    await getAgendaIntelligence(SHOP_ID, "mes");

    const arg = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: { closedAt: { gte: Date; lte: Date } };
    };
    expect(arg.where.closedAt.gte).toBeInstanceOf(Date);
    expect(arg.where.closedAt.lte).toBeInstanceOf(Date);
    // Within this month
    const now = new Date();
    expect(arg.where.closedAt.gte.getMonth()).toBe(now.getMonth());
  });

  it("aggregates 300 comandas across 15 slots (no extra queries)", async () => {
    const comandas = Array.from({ length: 300 }, (_, i) => ({
      totalInCents: 4000,
      closedAt: new Date(`2026-06-14T${9 + (i % 12)}:00:00Z`),
      professionalId: "prof-1",
      clientId: `client-${i}`,
      professional: { id: "prof-1", name: "Pedro" },
    }));
    vi.mocked(db.comanda.findMany).mockResolvedValue(comandas as never);

    const result = await getAgendaIntelligence(SHOP_ID, "mes");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledTimes(1);
    expect(result.slotsPorHora).toHaveLength(15); // 7h–21h
    expect(result.topProfissionais).toHaveLength(1);
    expect(result.topProfissionais[0].totalComandas).toBe(300);
  });
});
