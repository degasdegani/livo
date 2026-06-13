/**
 * TEST-02 — Multi-tenant isolation: API Lívia
 *
 * Guards tested (api/livia/route.ts):
 *   1. Unauthenticated request → 401 (getCurrentMembership() returns null)
 *   2. Barbershop data fetched with membership.barbershopId (not user-supplied ID)
 *   3. Comanda aggregate scoped to membership.barbershopId
 *   4. Appointment count scoped to membership.barbershopId
 *
 * The route uses getCurrentMembership() (not requireMembership), so the 401
 * guard is inside the handler itself, not in a middleware layer.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import { POST } from "@/app/api/livia/route";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn() },
    comanda: { aggregate: vi.fn() },
    appointment: { count: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  getCurrentMembership: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    livia: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// Mock global fetch (Anthropic API call)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const memberCtx = () => makeMembershipContext({ barbershopId: SHOP_A });

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown = { messages: [{ role: "user", content: "Olá" }] }) {
  return new NextRequest("http://localhost/api/livia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAnthropicSuccess() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      content: [{ text: "Olá! Como posso ajudar?" }],
    }),
  });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.comanda.aggregate).mockResolvedValue({
    _sum: { totalInCents: 0 },
  } as never);
  vi.mocked(db.appointment.count).mockResolvedValue(0);
  vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — API Lívia", () => {
  describe("authentication guard", () => {
    it("returns 401 when user is unauthenticated", async () => {
      vi.mocked(getCurrentMembership).mockResolvedValue(null);

      const res = await POST(makeRequest());

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Não autorizado" });
    });

    it("proceeds when user is authenticated", async () => {
      vi.mocked(getCurrentMembership).mockResolvedValue(memberCtx());
      mockAnthropicSuccess();

      const res = await POST(makeRequest());

      // Not 401 — authenticated user gets through
      expect(res.status).not.toBe(401);
    });
  });

  describe("tenant data isolation", () => {
    it("fetches barbershop data using membership.barbershopId — not user-supplied", async () => {
      vi.mocked(getCurrentMembership).mockResolvedValue(memberCtx());
      mockAnthropicSuccess();

      await POST(makeRequest());

      expect(vi.mocked(db.barbershop.findUnique)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SHOP_A },
        }),
      );
    });

    it("aggregates comanda revenue scoped to authenticated tenant only", async () => {
      vi.mocked(getCurrentMembership).mockResolvedValue(memberCtx());
      mockAnthropicSuccess();

      await POST(makeRequest());

      expect(vi.mocked(db.comanda.aggregate)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("counts appointments scoped to authenticated tenant only", async () => {
      vi.mocked(getCurrentMembership).mockResolvedValue(memberCtx());
      mockAnthropicSuccess();

      await POST(makeRequest());

      expect(vi.mocked(db.appointment.count)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("returns 400 for invalid messages payload", async () => {
      vi.mocked(getCurrentMembership).mockResolvedValue(memberCtx());

      const res = await POST(makeRequest({ messages: "not-an-array" }));

      expect(res.status).toBe(400);
    });
  });
});
