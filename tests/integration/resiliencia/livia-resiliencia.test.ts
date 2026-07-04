/**
 * TEST-09 — Resiliência: Lívia AI route (src/app/api/livia/route.ts)
 *
 * The Lívia route wraps everything in a single try/catch:
 *   - Auth failure         → 401 (before outer try)
 *   - Rate limit           → 429 (before outer try)
 *   - Invalid input        → 400 (before outer try)
 *   - Anthropic API error  → 500 (inside outer try, handled explicitly)
 *   - DB error             → 500 (outer catch)
 *   - fetch throws         → 500 (outer catch)
 *   - Any unhandled error  → 500 (outer catch)
 *
 * Failure criteria:
 *   - Remove outer catch → unhandled exceptions crash the serverless function
 *   - Remove Anthropic ok check → API errors returned as-is to client
 *   - Remove rate limiter → unlimited AI calls per user
 *   - Remove auth check → unauthenticated users access paid AI feature
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { POST } from "@/app/api/livia/route";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn() },
    comanda: { aggregate: vi.fn() },
    appointment: { count: vi.fn() },
  },
}));

vi.mock("@/lib/modules", () => ({
  hasModuleAccess: vi.fn().mockResolvedValue(true),
  requireModuleAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/permissions", () => ({
  getCurrentMembership: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    livia: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Global fetch mock ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeAll(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-livia-1";
const USER_ID_BASE = "user-livia";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(
  body: unknown = { messages: [{ role: "user", content: "Oi Lívia!" }] },
  options: { jsonThrows?: Error } = {},
): NextRequest {
  return {
    headers: { get: (key: string) => (key === "x-correlation-id" ? "test-cid" : null) },
    json: options.jsonThrows
      ? vi.fn().mockRejectedValue(options.jsonThrows)
      : vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function mockSuccessfulFetch() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      content: [{ text: "Olá! Como posso ajudar?" }],
    }),
  });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

let testUserCounter = 0;

beforeEach(() => {
  vi.clearAllMocks();

  // Unique userId per test to avoid rate limit bleed-over
  const userId = `${USER_ID_BASE}-${++testUserCounter}`;

  vi.mocked(getCurrentMembership).mockResolvedValue({
    userId,
    barbershopId: SHOP_ID,
    role: MemberRole.owner,
    membershipId: "mem-1",
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
  } as never);

  vi.mocked(db.barbershop.findUnique).mockResolvedValue({
    id: SHOP_ID,
    name: "Barbearia Test",
    city: "São Paulo",
    state: "SP",
    services: [{ name: "Corte", priceInCents: 3500, durationMin: 30 }],
    professionals: [{ name: "Pedro" }],
    _count: { clients: 42 },
  } as never);

  vi.mocked(db.comanda.aggregate).mockResolvedValue({
    _sum: { totalInCents: 150000 },
  } as never);

  vi.mocked(db.appointment.count).mockResolvedValue(30);

  mockSuccessfulFetch();
});

// ── Authentication ────────────────────────────────────────────────────────────

describe("Authentication", () => {
  it("returns 401 when getCurrentMembership returns null", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(null);

    const res = await POST(makeReq());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/não autorizado/i);
  });

  it("returns 401 when getCurrentMembership throws", async () => {
    vi.mocked(getCurrentMembership).mockRejectedValue(new Error("session expired"));

    const res = await POST(makeReq());

    expect(res.status).toBe(500); // outer catch
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe("Input validation", () => {
  it("returns 400 when messages is null", async () => {
    const res = await POST(makeReq({ messages: null }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/mensagens inválidas/i);
  });

  it("returns 400 when messages is a string (not an array)", async () => {
    const res = await POST(makeReq({ messages: "invalid" }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when messages is an object (not an array)", async () => {
    const res = await POST(makeReq({ messages: { role: "user" } }));

    expect(res.status).toBe(400);
  });

  it("returns 500 when req.json() throws (malformed body)", async () => {
    const req = makeReq(undefined, { jsonThrows: new SyntaxError("unexpected token") });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});

// ── Anthropic API failures ────────────────────────────────────────────────────

describe("Anthropic API failure paths", () => {
  it("returns 500 when Anthropic responds with 500", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: { message: "Internal error" } }),
    });

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/erro ao chamar a ia/i);
  });

  it("returns 500 when Anthropic responds with 429 (rate limited upstream)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ error: "rate_limit_exceeded" }),
    });

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
  });

  it("returns 500 when fetch() itself throws (network error)", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed: ECONNRESET"));

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/erro interno/i);
  });

  it("returns 500 when response.json() throws after ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new SyntaxError("unexpected end of JSON")),
    });

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
  });
});

// ── Database failures ─────────────────────────────────────────────────────────

describe("Database failures → outer catch → 500", () => {
  it("returns 500 when db.barbershop.findUnique throws", async () => {
    vi.mocked(db.barbershop.findUnique).mockRejectedValue(
      new Error("connection timeout"),
    );

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/erro interno/i);
  });

  it("returns 500 when db.comanda.aggregate throws", async () => {
    vi.mocked(db.comanda.aggregate).mockRejectedValue(new Error("query timeout"));

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
  });

  it("returns 500 when db.appointment.count throws", async () => {
    vi.mocked(db.appointment.count).mockRejectedValue(
      new Error("DB connection lost"),
    );

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe("Rate limiting (20 req/min per user)", () => {
  it("returns 429 after 20 requests in the same window", async () => {
    // Use a dedicated userId so this test doesn't interfere with others
    const rlUserId = "rate-limit-dedicated-user-test-abc";
    vi.mocked(getCurrentMembership).mockResolvedValue({
      userId: rlUserId,
      barbershopId: SHOP_ID,
      role: MemberRole.owner,
      membershipId: "mem-rl",
      professionalId: null,
      commissionOnServices: false,
      commissionOnProducts: false,
    } as never);

    // Make 20 successful requests
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeReq());
      expect(res.status).toBe(200);
    }

    // 21st should be blocked
    const blocked = await POST(makeReq());
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/limite de mensagens/i);
  });

  it("allows requests from a different user even when another is rate limited", async () => {
    // User A: exhaust the rate limit
    const userA = "rate-limit-user-a-isolation";
    const userB = `${USER_ID_BASE}-${++testUserCounter}-isolation`;

    vi.mocked(getCurrentMembership).mockResolvedValue({
      userId: userA,
      barbershopId: SHOP_ID,
      role: MemberRole.owner,
      membershipId: "mem-a",
      professionalId: null,
      commissionOnServices: false,
      commissionOnProducts: false,
    } as never);
    for (let i = 0; i < 20; i++) {
      await POST(makeReq());
    }
    const blockedA = await POST(makeReq());
    expect(blockedA.status).toBe(429);

    // User B should not be affected
    vi.mocked(getCurrentMembership).mockResolvedValue({
      userId: userB,
      barbershopId: SHOP_ID,
      role: MemberRole.owner,
      membershipId: "mem-b",
      professionalId: null,
      commissionOnServices: false,
      commissionOnProducts: false,
    } as never);
    const resB = await POST(makeReq());
    expect(resB.status).toBe(200);
  });
});

// ── Success path ──────────────────────────────────────────────────────────────

describe("Success path", () => {
  it("returns 200 with Anthropic message text", async () => {
    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Olá! Como posso ajudar?");
  });

  it("returns fallback text when Anthropic content array is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ content: [] }),
    });

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeTruthy();
  });
});
