/**
 * TEST-09 — Resiliência: Webhook Asaas (src/app/api/webhooks/asaas/route.ts)
 *
 * Error handling contract:
 *   - All errors are caught by the outer try/catch → returns 500
 *   - Malformed JSON body → req.json() throws → outer catch → 500
 *   - DB throws on any updateMany → outer catch → 500
 *   - Missing subscription/payment fields → no DB call, returns 200 (safe no-op)
 *   - Unknown event type → no DB call, returns 200
 *
 * Idempotency contract:
 *   - Repeated PAYMENT_CONFIRMED → updateMany is called each time (DB handles idempotency)
 *   - Lifetime status is NEVER overwritten, regardless of how many times events arrive
 *
 * Note: happy-path event handling (auth, status transitions, lifetime protection)
 * is covered in billing/webhook-asaas.test.ts. This file covers infrastructure failures.
 *
 * Failure criteria:
 *   - Remove outer try/catch → single DB error crashes the webhook handler
 *   - Remove safe no-op for missing fields → NPE on partial payloads
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { PlanStatus } from "@prisma/client";
import { POST } from "@/app/api/webhooks/asaas/route";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    billing: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    webhook: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_TOKEN = "wh-secret-test-token";
const SUB_ID = "sub-test-001";
const PAY_ID = "pay-test-001";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(options: {
  token?: string | null;
  body?: object;
  jsonThrows?: Error;
}): NextRequest {
  const { token = VALID_TOKEN, body = {}, jsonThrows } = options;
  return {
    headers: {
      get: (key: string): string | null => {
        if (key === "asaas-access-token") return token;
        if (key === "x-correlation-id") return null;
        return null;
      },
    },
    json: jsonThrows
      ? vi.fn().mockRejectedValue(jsonThrows)
      : vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function paymentBody(event: string, subscriptionId?: string) {
  return {
    event,
    payment: subscriptionId
      ? { id: PAY_ID, subscription: subscriptionId }
      : { id: PAY_ID },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.ASAAS_WEBHOOK_TOKEN = VALID_TOKEN;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.barbershop.updateMany).mockResolvedValue({ count: 1 } as never);
});

// ── Malformed request body ────────────────────────────────────────────────────

describe("Malformed request body", () => {
  it("returns 500 when req.json() throws (malformed JSON body)", async () => {
    const req = makeReq({
      jsonThrows: new SyntaxError("Unexpected token { in JSON"),
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
  });

  it("logs webhook.error when req.json() throws", async () => {
    const parseErr = new SyntaxError("invalid json");
    const req = makeReq({ jsonThrows: parseErr });

    await POST(req);

    expect(vi.mocked(log.webhook.error)).toHaveBeenCalledWith(
      expect.stringContaining("erro ao processar"),
      expect.any(Object),
      parseErr,
    );
  });
});

// ── Database failures ─────────────────────────────────────────────────────────

describe("Database failures → outer catch → 500", () => {
  it("returns 500 when DB throws on PAYMENT_CONFIRMED", async () => {
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(
      new Error("connection timeout"),
    );

    const res = await POST(
      makeReq({ body: paymentBody("PAYMENT_CONFIRMED", SUB_ID) }),
    );

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal error");
  });

  it("returns 500 when DB throws on PAYMENT_OVERDUE", async () => {
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(
      new Error("deadlock detected"),
    );

    const res = await POST(
      makeReq({ body: paymentBody("PAYMENT_OVERDUE", SUB_ID) }),
    );

    expect(res.status).toBe(500);
  });

  it("returns 500 when DB throws on PAYMENT_DELETED", async () => {
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(
      new Error("unique constraint violation"),
    );

    const res = await POST(
      makeReq({ body: paymentBody("PAYMENT_DELETED", SUB_ID) }),
    );

    expect(res.status).toBe(500);
  });

  it("returns 500 when DB throws on SUBSCRIPTION_DELETED", async () => {
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(
      new Error("DB unreachable"),
    );

    const res = await POST(
      makeReq({
        body: { event: "SUBSCRIPTION_DELETED", subscription: { id: SUB_ID } },
      }),
    );

    expect(res.status).toBe(500);
  });

  it("logs webhook.error with correlationId context on DB failure", async () => {
    const dbErr = new Error("connection pool exhausted");
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(dbErr);

    await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED", SUB_ID) }));

    expect(vi.mocked(log.webhook.error)).toHaveBeenCalledWith(
      expect.stringContaining("erro ao processar evento Asaas"),
      expect.any(Object),
      dbErr,
    );
  });
});

// ── Safe no-op for missing fields ─────────────────────────────────────────────

describe("Safe no-op — missing subscription/payment fields", () => {
  it("does NOT call DB when PAYMENT_CONFIRMED has no payment.subscription", async () => {
    const res = await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED") }));

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("does NOT call DB when PAYMENT_OVERDUE has no payment.subscription", async () => {
    const res = await POST(makeReq({ body: paymentBody("PAYMENT_OVERDUE") }));

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("does NOT call DB when PAYMENT_DELETED has no payment.subscription", async () => {
    const res = await POST(makeReq({ body: paymentBody("PAYMENT_DELETED") }));

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("does NOT call DB when SUBSCRIPTION_DELETED has no subscription.id", async () => {
    const res = await POST(
      makeReq({ body: { event: "SUBSCRIPTION_DELETED", subscription: {} } }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("passes through unknown event types without touching DB", async () => {
    const res = await POST(
      makeReq({
        body: { event: "SUBSCRIPTION_UPDATED", payment: { id: PAY_ID, subscription: SUB_ID } },
      }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe("Idempotency — repeated webhook events", () => {
  it("PAYMENT_CONFIRMED delivered twice calls updateMany twice (DB enforces idempotency)", async () => {
    const body = paymentBody("PAYMENT_CONFIRMED", SUB_ID);

    await POST(makeReq({ body }));
    await POST(makeReq({ body }));

    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledTimes(2);
    // Both calls use the same WHERE clause — DB upsert is naturally idempotent
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planStatus: PlanStatus.active,
        }),
      }),
    );
  });

  it("PAYMENT_CONFIRMED after PAYMENT_OVERDUE re-activates the plan", async () => {
    await POST(makeReq({ body: paymentBody("PAYMENT_OVERDUE", SUB_ID) }));
    await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED", SUB_ID) }));

    // Second call must update to active
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planStatus: PlanStatus.active,
        }),
      }),
    );
  });

  it("reactivates when dateCreated is strictly later, no tie (ordering guard)", async () => {
    // Regressão do guard de ordenação do C1 com timestamps NÃO empatados: um
    // OVERDUE às 10:00:00 seguido de um CONFIRMED às 10:00:01 (1s depois) deve
    // reativar. Cenário determinístico (sem empate de segundo/fallback) — trava
    // a política atual de `{ lt: eventAt }` para eventos estritamente ordenados.
    // A resolução do empate no MESMO segundo é decisão de arquitetura à parte.
    await POST(
      makeReq({
        body: {
          event: "PAYMENT_OVERDUE",
          dateCreated: "2026-07-02 10:00:00",
          payment: { id: PAY_ID, subscription: SUB_ID },
        },
      }),
    );
    await POST(
      makeReq({
        body: {
          event: "PAYMENT_CONFIRMED",
          dateCreated: "2026-07-02 10:00:01",
          payment: { id: PAY_ID, subscription: SUB_ID },
        },
      }),
    );

    const calls = vi.mocked(db.barbershop.updateMany).mock.calls;
    expect(calls).toHaveLength(2);
    // 1º evento (mais antigo) suspende; 2º evento (mais recente) reativa.
    expect(calls[0][0].data).toMatchObject({ planStatus: PlanStatus.suspended });
    expect(calls[1][0].data).toMatchObject({ planStatus: PlanStatus.active });
    // O guard grava o timestamp do evento processado.
    expect(calls[1][0].data).toHaveProperty("lastBillingEventAt");
    expect(calls[1][0].data.lastBillingEventAt).toEqual(
      new Date("2026-07-02 10:00:01"),
    );
  });

  it("lifetime plan guard is in WHERE clause — repeated events leave lifetime status untouched", async () => {
    await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED", SUB_ID) }));
    await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED", SUB_ID) }));

    // Every call has the lifetime guard in WHERE
    const calls = vi.mocked(db.barbershop.updateMany).mock.calls;
    for (const [arg] of calls) {
      expect(arg.where).toMatchObject({
        planStatus: { not: PlanStatus.lifetime },
      });
    }
  });
});
