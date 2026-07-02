/**
 * TEST-05 — Billing: Webhook Asaas route handler
 *
 * Tests src/app/api/webhooks/asaas/route.ts
 *
 * Covers:
 *   - Authentication (token validation)
 *   - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → planStatus: active
 *   - PAYMENT_OVERDUE → planStatus: suspended
 *   - PAYMENT_DELETED → planStatus: cancelled
 *   - SUBSCRIPTION_DELETED → planStatus: cancelled
 *   - Lifetime protection (never overwritten)
 *   - Tenant isolation (scoped by asaasSubscriptionId)
 *   - Idempotency (repeated events stay correct)
 *   - Observability (log.billing.* / log.webhook.*)
 *   - Error handling → 500
 *
 * Failure criterion:
 *   - Remove lifetime guard → lifetime plan suspended/cancelled by webhook
 *   - Remove auth check → unauthenticated caller activates plans
 *   - Change DB field → webhook stops activating/suspending plans
 *   - Remove subscription scoping → cross-tenant plan mutation
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
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
    billing: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    webhook: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_TOKEN = "test-webhook-token-abc";
const SUB_A = "sub-aaaa";
const PAY_A = "pay-bbbb";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(options: {
  token?: string | null;
  body?: object;
  correlationId?: string | null;
}): NextRequest {
  const {
    token = VALID_TOKEN,
    body = {},
    correlationId = null,
  } = options;

  return {
    headers: {
      get: (key: string): string | null => {
        if (key === "asaas-access-token") return token;
        if (key === "x-correlation-id") return correlationId;
        return null;
      },
    },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

function paymentBody(event: string, subscriptionId?: string, paymentId = PAY_A) {
  return {
    event,
    payment: subscriptionId
      ? { id: paymentId, subscription: subscriptionId }
      : { id: paymentId },
  };
}

function subscriptionBody(event: string, subscriptionId: string) {
  return {
    event,
    subscription: { id: subscriptionId },
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

// ══════════════════════════════════════════════════════════════════════════════
// Authentication
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — authentication", () => {
  it("returns 401 when no access token is provided", async () => {
    const req = makeReq({ token: null });

    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("returns 401 when access token does not match", async () => {
    const req = makeReq({ token: "wrong-token" });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("returns 200 when access token is valid", async () => {
    const req = makeReq({ body: paymentBody("UNKNOWN_EVENT") });

    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("logs webhook.warn and does not call DB when token is invalid", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({ token: "bad-token" });

    await POST(req);

    expect(vi.mocked(log.webhook.warn)).toHaveBeenCalledWith(
      expect.stringContaining("token"),
      expect.any(Object),
    );
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT_CONFIRMED / PAYMENT_RECEIVED
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — PAYMENT_CONFIRMED / PAYMENT_RECEIVED", () => {
  it("activates PRO plan when PAYMENT_CONFIRMED with subscriptionId", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", SUB_A),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planStatus: PlanStatus.active,
          plan: "pro",
        }),
      }),
    );
  });

  it("activates PRO plan when PAYMENT_RECEIVED with subscriptionId", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_RECEIVED", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planStatus: PlanStatus.active }),
      }),
    );
  });

  it("scopes updateMany to the specific asaasSubscriptionId (tenant isolation)", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", "sub-specific-id"),
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asaasSubscriptionId: "sub-specific-id",
        }),
      }),
    );
  });

  it("never updates lifetime plan (WHERE clause excludes lifetime)", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planStatus: { not: PlanStatus.lifetime },
        }),
      }),
    );
  });

  it("skips DB update when payment has no subscription field", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", undefined), // no subscription
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("logs billing.info when plan is activated", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(log.billing.info)).toHaveBeenCalledWith(
      expect.stringContaining("PRO"),
      expect.any(Object),
    );
  });

  it("passes correlationId from header to log context", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", SUB_A),
      correlationId: "req-correlation-xyz",
    });

    await POST(req);

    expect(vi.mocked(log.billing.info)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ correlationId: "req-correlation-xyz" }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT_OVERDUE
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — PAYMENT_OVERDUE", () => {
  it("suspends plan when PAYMENT_OVERDUE with subscriptionId", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_OVERDUE", SUB_A),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asaasSubscriptionId: SUB_A,
          planStatus: { not: PlanStatus.lifetime },
          // C1 (guard de ordenação): só aplica se o evento for mais recente.
          OR: [
            { lastBillingEventAt: null },
            { lastBillingEventAt: { lt: expect.any(Date) } },
          ],
        }),
        data: expect.objectContaining({
          planStatus: PlanStatus.suspended,
          lastBillingEventAt: expect.any(Date),
        }),
      }),
    );
  });

  it("never suspends lifetime plan", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_OVERDUE", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planStatus: { not: PlanStatus.lifetime },
        }),
      }),
    );
  });

  it("logs billing.warn on overdue event", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({
      body: paymentBody("PAYMENT_OVERDUE", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(log.billing.warn)).toHaveBeenCalledWith(
      expect.stringContaining("inadimplência"),
      expect.any(Object),
    );
  });

  it("skips DB update when overdue payment has no subscription field", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_OVERDUE", undefined),
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT_DELETED
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — PAYMENT_DELETED", () => {
  it("cancels plan when PAYMENT_DELETED with subscriptionId", async () => {
    const req = makeReq({
      body: paymentBody("PAYMENT_DELETED", SUB_A),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asaasSubscriptionId: SUB_A,
          planStatus: { not: PlanStatus.lifetime },
          OR: [
            { lastBillingEventAt: null },
            { lastBillingEventAt: { lt: expect.any(Date) } },
          ],
        }),
        data: expect.objectContaining({
          planStatus: PlanStatus.cancelled,
          lastBillingEventAt: expect.any(Date),
        }),
      }),
    );
  });

  it("logs billing.warn on payment deleted event", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({
      body: paymentBody("PAYMENT_DELETED", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(log.billing.warn)).toHaveBeenCalledWith(
      expect.stringContaining("cancelado"),
      expect.any(Object),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION_DELETED
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — SUBSCRIPTION_DELETED", () => {
  it("cancels plan using subscription.id (not payment.subscription)", async () => {
    const req = makeReq({
      body: subscriptionBody("SUBSCRIPTION_DELETED", SUB_A),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asaasSubscriptionId: SUB_A,
          planStatus: { not: PlanStatus.lifetime },
          OR: [
            { lastBillingEventAt: null },
            { lastBillingEventAt: { lt: expect.any(Date) } },
          ],
        }),
        data: expect.objectContaining({
          planStatus: PlanStatus.cancelled,
          lastBillingEventAt: expect.any(Date),
        }),
      }),
    );
  });

  it("skips DB update when SUBSCRIPTION_DELETED has no subscription.id", async () => {
    const req = makeReq({
      body: { event: "SUBSCRIPTION_DELETED", subscription: {} }, // no .id
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("never cancels lifetime plan via SUBSCRIPTION_DELETED", async () => {
    const req = makeReq({
      body: subscriptionBody("SUBSCRIPTION_DELETED", SUB_A),
    });

    await POST(req);

    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planStatus: { not: PlanStatus.lifetime },
        }),
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Unknown events
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — unknown events", () => {
  it("returns 200 without touching DB for unknown event type", async () => {
    const req = makeReq({
      body: { event: "PAYMENT_REFUNDED", payment: { id: PAY_A } },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(db.barbershop.updateMany)).not.toHaveBeenCalled();
  });

  it("logs webhook.info for every event received", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({
      body: { event: "SOME_EVENT", payment: { id: PAY_A } },
    });

    await POST(req);

    expect(vi.mocked(log.webhook.info)).toHaveBeenCalledWith(
      expect.stringContaining("evento"),
      expect.any(Object),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Idempotency
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — idempotency", () => {
  it("handles duplicate PAYMENT_CONFIRMED: both calls return 200", async () => {
    const body = paymentBody("PAYMENT_CONFIRMED", SUB_A);

    const [res1, res2] = await Promise.all([
      POST(makeReq({ body })),
      POST(makeReq({ body })),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it("lifetime plan unaffected by duplicate PAYMENT_OVERDUE events", async () => {
    // Even if overdue fires twice, lifetime barbershops are excluded by WHERE clause
    vi.mocked(db.barbershop.updateMany).mockResolvedValue({ count: 0 } as never);

    for (let i = 0; i < 3; i++) {
      await POST(makeReq({ body: paymentBody("PAYMENT_OVERDUE", SUB_A) }));
    }

    // All calls include the lifetime guard
    const allCalls = vi.mocked(db.barbershop.updateMany).mock.calls;
    for (const call of allCalls) {
      expect(call[0].where).toMatchObject({
        planStatus: { not: PlanStatus.lifetime },
      });
    }
  });

  it("PAYMENT_CONFIRMED after PAYMENT_OVERDUE restores active status", async () => {
    const subId = "sub-recovery";

    await POST(makeReq({ body: paymentBody("PAYMENT_OVERDUE", subId) }));
    await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED", subId) }));

    const calls = vi.mocked(db.barbershop.updateMany).mock.calls;
    expect(calls[0][0].data).toMatchObject({ planStatus: PlanStatus.suspended });
    expect(calls[1][0].data).toMatchObject({ planStatus: PlanStatus.active });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Error handling / observability
// ══════════════════════════════════════════════════════════════════════════════

describe("Webhook — error handling and observability", () => {
  it("returns 500 when DB throws unexpectedly", async () => {
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(
      new Error("DB connection lost"),
    );

    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", SUB_A),
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
  });

  it("logs webhook.error when exception occurs during processing", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(db.barbershop.updateMany).mockRejectedValue(
      new Error("unexpected"),
    );

    await POST(makeReq({ body: paymentBody("PAYMENT_CONFIRMED", SUB_A) }));

    expect(vi.mocked(log.webhook.error)).toHaveBeenCalled();
  });

  it("always returns 200 for valid events (Asaas does not retry on 200)", async () => {
    const events = [
      paymentBody("PAYMENT_CONFIRMED", SUB_A),
      paymentBody("PAYMENT_RECEIVED", SUB_A),
      paymentBody("PAYMENT_OVERDUE", SUB_A),
      paymentBody("PAYMENT_DELETED", SUB_A),
      subscriptionBody("SUBSCRIPTION_DELETED", SUB_A),
    ];

    for (const body of events) {
      const res = await POST(makeReq({ body }));
      expect(res.status).toBe(200);
    }
  });

  it("passes correlationId header to webhook.info log", async () => {
    const { log } = await import("@/lib/logger");
    const req = makeReq({
      body: paymentBody("PAYMENT_CONFIRMED", SUB_A),
      correlationId: "trace-id-001",
    });

    await POST(req);

    expect(vi.mocked(log.webhook.info)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ correlationId: "trace-id-001" }),
    );
  });
});
