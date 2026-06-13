/**
 * TEST-09 — Resiliência: Billing / Asaas (src/app/(dashboard)/dashboard/assinar/actions.ts)
 *
 * Error handling contracts:
 *   Outer try/catch wraps the entire function:
 *     - createAsaasCustomer throws     → { error: "Erro ao criar assinatura..." }
 *     - createAsaasSubscription throws → { error: "Erro ao criar assinatura..." }
 *     - getSubscriptionPayments throws → { error: "Erro ao criar assinatura..." }
 *     - db.barbershop.findUnique throws → { error: "Erro ao criar assinatura..." }
 *     - db.barbershop.update throws   → { error: "Erro ao criar assinatura..." }
 *
 *   Inner try/catch wraps only getChargePixQrCode (graceful degradation):
 *     - getChargePixQrCode throws     → { success: true, billingType, invoiceUrl }
 *       (no pixPayload / pixImage fields — PIX degraded but subscription still created)
 *
 * Failure criteria:
 *   - Remove inner try/catch around getChargePixQrCode → PIX failure crashes entire subscription
 *   - Remove outer try/catch → unhandled exceptions surface raw errors to client
 *   - Remove log.billing.error → silent failures in observability
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemberRole, PlanStatus } from "@prisma/client";
import { getCurrentMembership } from "@/lib/permissions";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getChargePixQrCode,
  getSubscriptionPayments,
} from "@/lib/asaas";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { createSubscription } from "@/app/(dashboard)/dashboard/assinar/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/permissions", () => ({
  getCurrentMembership: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/asaas", () => ({
  createAsaasCustomer: vi.fn(),
  createAsaasSubscription: vi.fn(),
  getSubscriptionPayments: vi.fn(),
  getChargePixQrCode: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    billing: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_ID = "shop-billing-1";
const USER_ID = "user-billing-1";
const CUSTOMER_ID = "cus-asaas-001";
const SUBSCRIPTION_ID = "sub-asaas-001";
const PAYMENT_ID = "pay-asaas-001";
const INVOICE_URL = "https://asaas.com/invoice/pay-asaas-001";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    cpfCnpj: "12345678901",
    billingType: "monthly",
  };
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    fd.set(key, value);
  }
  return fd;
}

function makeMembership(overrides: Partial<{ role: MemberRole }> = {}) {
  return {
    userId: USER_ID,
    barbershopId: SHOP_ID,
    role: MemberRole.owner,
    membershipId: "mem-1",
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
    ...overrides,
  };
}

function makeBarbershop(overrides: Partial<{
  planStatus: PlanStatus;
  asaasCustomerId: string | null;
  trialEndsAt: Date | null;
}> = {}) {
  return {
    id: SHOP_ID,
    name: "Barbearia Test",
    phone: "11999999999",
    planStatus: PlanStatus.trial,
    asaasCustomerId: null,
    asaasSubscriptionId: null,
    trialEndsAt: null,
    owner: { name: "João Dono", email: "dono@example.com" },
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getCurrentMembership).mockResolvedValue(makeMembership() as never);
  vi.mocked(db.barbershop.findUnique).mockResolvedValue(makeBarbershop() as never);
  vi.mocked(db.barbershop.update).mockResolvedValue({} as never);

  vi.mocked(createAsaasCustomer).mockResolvedValue({
    id: CUSTOMER_ID,
    name: "João Dono",
    email: "dono@example.com",
    cpfCnpj: "12345678901",
  });

  vi.mocked(createAsaasSubscription).mockResolvedValue({
    id: SUBSCRIPTION_ID,
    status: "ACTIVE",
    value: 197.0,
    nextDueDate: "2026-07-13",
    customer: CUSTOMER_ID,
  });

  vi.mocked(getSubscriptionPayments).mockResolvedValue({
    data: [{ id: PAYMENT_ID, invoiceUrl: INVOICE_URL, status: "PENDING", value: 197, dueDate: "2026-07-13" }],
  } as never);

  vi.mocked(getChargePixQrCode).mockResolvedValue({
    encodedImage: "base64img",
    payload: "00020101...",
    expirationDate: "2026-07-14",
  });
});

// ── Pre-flight guard rails (NOT outer catch paths) ────────────────────────────

describe("Guard rail failures — early returns before Asaas", () => {
  it("returns error when getCurrentMembership returns null", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(null);

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe("Não autenticado.");
    expect(createAsaasCustomer).not.toHaveBeenCalled();
  });

  it("returns error when membership role is not owner", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(
      makeMembership({ role: MemberRole.barber }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe("Sem permissão.");
    expect(createAsaasCustomer).not.toHaveBeenCalled();
  });

  it("returns error when CPF is too short", async () => {
    const result = await createSubscription(null, makeFormData({ cpfCnpj: "123" }));

    expect(result.error).toMatch(/cpf inválido/i);
    expect(db.barbershop.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when barbershop already has active plan", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.active }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toMatch(/assinatura ativa/i);
    expect(createAsaasCustomer).not.toHaveBeenCalled();
  });

  it("returns error when barbershop has lifetime plan", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.lifetime }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toMatch(/acesso vitalício/i);
    expect(createAsaasCustomer).not.toHaveBeenCalled();
  });
});

// ── Asaas API failures (outer catch) ─────────────────────────────────────────

describe("Asaas API failures → outer catch → error result", () => {
  it("returns error when createAsaasCustomer throws", async () => {
    vi.mocked(createAsaasCustomer).mockRejectedValue(
      new Error("Asaas API error: 422"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.success).toBeUndefined();
    expect(result.error).toBe(
      "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    );
  });

  it("returns error when createAsaasSubscription throws", async () => {
    // Barbershop already has customerId to skip createAsaasCustomer
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );
    vi.mocked(createAsaasSubscription).mockRejectedValue(
      new Error("Asaas API error: 503"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe(
      "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    );
    expect(result.success).toBeUndefined();
  });

  it("returns error when getSubscriptionPayments throws", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );
    vi.mocked(getSubscriptionPayments).mockRejectedValue(
      new Error("Asaas API error: 500"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe(
      "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    );
  });

  it("logs billing.error with the caught error on Asaas failure", async () => {
    const asaasErr = new Error("Asaas down");
    vi.mocked(createAsaasCustomer).mockRejectedValue(asaasErr);

    await createSubscription(null, makeFormData());

    expect(vi.mocked(log.billing.error)).toHaveBeenCalledWith(
      expect.stringContaining("erro ao criar assinatura"),
      expect.any(Object),
      asaasErr,
    );
  });
});

// ── PIX graceful degradation (inner catch) ────────────────────────────────────

describe("getChargePixQrCode graceful degradation — inner catch", () => {
  it("returns success: true when getChargePixQrCode throws (no pixPayload/pixImage)", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );
    vi.mocked(getChargePixQrCode).mockRejectedValue(
      new Error("PIX QR code generation failed"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.success).toBe(true);
    expect(result.invoiceUrl).toBe(INVOICE_URL);
    expect(result.pixPayload).toBeUndefined();
    expect(result.pixImage).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("does NOT propagate PIX failure to the outer catch (does NOT return error)", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );
    vi.mocked(getChargePixQrCode).mockRejectedValue(new Error("PIX timeout"));

    const result = await createSubscription(null, makeFormData());

    // outer catch would set result.error — this must NOT be set
    expect(result.error).toBeUndefined();
    expect(log.billing.error).not.toHaveBeenCalled();
  });

  it("includes billingType in graceful-degradation result", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );
    vi.mocked(getChargePixQrCode).mockRejectedValue(new Error("PIX error"));

    const result = await createSubscription(
      null,
      makeFormData({ billingType: "yearly" }),
    );

    expect(result.success).toBe(true);
    expect(result.billingType).toBe("yearly");
  });
});

// ── Database failures (outer catch) ──────────────────────────────────────────

describe("Database failures → outer catch → error result", () => {
  it("returns error when db.barbershop.findUnique throws", async () => {
    vi.mocked(db.barbershop.findUnique).mockRejectedValue(
      new Error("connection timeout"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe(
      "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    );
    expect(result.success).toBeUndefined();
  });

  it("returns error when db.barbershop.update (save customerId) throws", async () => {
    vi.mocked(db.barbershop.update).mockRejectedValue(
      new Error("unique constraint on asaasCustomerId"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe(
      "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    );
  });

  it("returns error when db.barbershop.update (save subscriptionId) throws", async () => {
    // Barbershop already has customerId — first update (save customerId) is skipped
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );
    vi.mocked(db.barbershop.update).mockRejectedValue(
      new Error("DB write failed"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBe(
      "Erro ao criar assinatura. Verifique os dados e tente novamente.",
    );
  });

  it("logs billing.error when DB update throws", async () => {
    const dbErr = new Error("disk quota exceeded");
    vi.mocked(db.barbershop.update).mockRejectedValue(dbErr);

    await createSubscription(null, makeFormData());

    expect(vi.mocked(log.billing.error)).toHaveBeenCalledWith(
      expect.stringContaining("erro ao criar assinatura"),
      expect.any(Object),
      dbErr,
    );
  });
});

// ── Data integrity (no corruption on failure) ─────────────────────────────────

describe("Data integrity — no partial corruption on failure", () => {
  it("does NOT save subscriptionId when createAsaasSubscription throws after customerId saved", async () => {
    vi.mocked(createAsaasSubscription).mockRejectedValue(new Error("sub failed"));
    // Barbershop has no customerId → createAsaasCustomer runs → saves customerId → then fails
    let updateCallCount = 0;
    vi.mocked(db.barbershop.update).mockImplementation((async () => {
      updateCallCount++;
      if (updateCallCount === 1) return {} as never; // save customerId succeeds
      throw new Error("should not reach subscriptionId save");
    }) as never);

    const result = await createSubscription(null, makeFormData());

    // subscription creation failed so second update (subscriptionId) never reached
    expect(result.error).toBeDefined();
    // Only 1 update call (save customerId), not 2
    expect(updateCallCount).toBe(1);
  });

  it("does NOT call createAsaasSubscription when db.barbershop.update (customerId) fails", async () => {
    vi.mocked(db.barbershop.update).mockRejectedValue(new Error("write failed"));

    await createSubscription(null, makeFormData());

    expect(createAsaasSubscription).not.toHaveBeenCalled();
  });
});

// ── Happy path baseline ───────────────────────────────────────────────────────

describe("Happy path (baseline for regression)", () => {
  it("returns success with pix payload and invoiceUrl on full happy path", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.success).toBe(true);
    expect(result.invoiceUrl).toBe(INVOICE_URL);
    expect(result.pixPayload).toBe("00020101...");
    expect(result.pixImage).toBe("base64img");
    expect(result.error).toBeUndefined();
  });

  it("skips createAsaasCustomer when barbershop already has asaasCustomerId", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: CUSTOMER_ID }) as never,
    );

    await createSubscription(null, makeFormData());

    expect(createAsaasCustomer).not.toHaveBeenCalled();
    expect(createAsaasSubscription).toHaveBeenCalled();
  });
});
