/**
 * TEST-05 — Billing: createSubscription action
 *
 * Tests src/app/(dashboard)/dashboard/assinar/actions.ts
 *
 * Failure criterion:
 *   - Remove owner check → any role can create subscription
 *   - Remove active guard → duplicate subscription allowed
 *   - Remove lifetime guard → lifetime plan overridden with subscription
 *   - Remove subscriptionId persistence → webhook can't match barbershop
 *   - Activate plan here (instead of in webhook) → plan active before payment confirmed
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  getSubscriptionPayments,
  getChargePixQrCode,
} from "@/lib/asaas";
import { PlanStatus, MemberRole } from "@prisma/client";
import { createSubscription } from "@/app/(dashboard)/dashboard/assinar/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  getCurrentMembership: vi.fn(),
}));

vi.mock("@/lib/asaas", () => ({
  createAsaasCustomer: vi.fn(),
  createAsaasSubscription: vi.fn(),
  getSubscriptionPayments: vi.fn(),
  getChargePixQrCode: vi.fn(),
  cancelAsaasSubscription: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    billing: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const USER_A = "user-a";

function makeOwnerMembership() {
  return {
    membershipId: "mem-1",
    userId: USER_A,
    role: MemberRole.owner,
    barbershopId: SHOP_A,
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
  };
}

function makeBarbershop(overrides: Record<string, unknown> = {}) {
  return {
    id: SHOP_A,
    name: "Barbearia Test",
    phone: "11999999999",
    asaasCustomerId: null,
    asaasSubscriptionId: null,
    planStatus: PlanStatus.trial,
    trialEndsAt: null,
    owner: {
      id: USER_A,
      name: "Owner Test",
      email: "owner@test.com",
    },
    ...overrides,
  };
}

function makeFormData(fields: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("cpfCnpj", "12345678901");
  fd.set("billingType", "monthly");
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.barbershop.update).mockResolvedValue({} as never);
  vi.mocked(db.barbershop.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(createAsaasCustomer).mockResolvedValue({
    id: "cus-new",
    name: "Test",
    email: "test@test.com",
    cpfCnpj: "12345678901",
  });
  vi.mocked(createAsaasSubscription).mockResolvedValue({
    id: "sub-new",
    status: "ACTIVE",
    value: 197,
    nextDueDate: "2026-07-15",
    customer: "cus-new",
  });
  vi.mocked(getSubscriptionPayments).mockResolvedValue({
    data: [
      {
        id: "pay-1",
        status: "PENDING",
        value: 197,
        dueDate: "2026-07-15",
        invoiceUrl: "https://invoice.example.com/pay-1",
      },
    ],
  });
  vi.mocked(getChargePixQrCode).mockResolvedValue({
    encodedImage: "base64-image-data",
    payload: "pix-payload-string",
    expirationDate: "2026-07-16",
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("createSubscription() — access guards", () => {
  it("returns error when user is not authenticated", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(null);

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("autenticado");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("returns error when user is not an owner (receptionist)", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue({
      ...makeOwnerMembership(),
      role: MemberRole.reception,
    });

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("permissão");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("returns error when user is not an owner (barber)", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue({
      ...makeOwnerMembership(),
      role: MemberRole.barber,
    });

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("permissão");
  });
});

describe("createSubscription() — input validation", () => {
  it("returns error when CPF is not provided", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());

    const fd = new FormData(); // no cpfCnpj
    const result = await createSubscription(null, fd);

    expect(result.error).toContain("CPF inválido");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("returns error when CPF has fewer than 11 digits", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());

    const result = await createSubscription(
      null,
      makeFormData({ cpfCnpj: "1234567890" }), // 10 digits
    );

    expect(result.error).toContain("CPF inválido");
  });

  it("accepts CPF with formatting (masks stripped before validation)", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.trial }) as never,
    );

    // CPF with mask has 11 actual digits
    const result = await createSubscription(
      null,
      makeFormData({ cpfCnpj: "123.456.789-01" }),
    );

    expect(result.error).toBeUndefined();
  });
});

describe("createSubscription() — billing state guards", () => {
  it("returns error when barbershop not found", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("Barbearia não encontrada");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("returns error when plan is already active", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.active }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("assinatura ativa");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("returns error when plan is lifetime (vitalício)", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.lifetime }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("vitalício");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("blocks new subscription when plan is suspended (must pay pending invoice)", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.suspended }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("inadimplência");
    expect(vi.mocked(createAsaasSubscription)).not.toHaveBeenCalled();
  });

  it("allows reactivation when plan is cancelled", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ planStatus: PlanStatus.cancelled }) as never,
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toBeUndefined();
    expect(vi.mocked(createAsaasSubscription)).toHaveBeenCalled();
  });
});

describe("createSubscription() — Asaas customer creation", () => {
  it("creates Asaas customer and persists asaasCustomerId when none exists", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: null }) as never,
    );

    await createSubscription(null, makeFormData());

    expect(vi.mocked(createAsaasCustomer)).toHaveBeenCalledTimes(1);
    // Must persist the new customerId to DB
    expect(vi.mocked(db.barbershop.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asaasCustomerId: "cus-new" }),
      }),
    );
  });

  it("reuses existing asaasCustomerId without calling createAsaasCustomer", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: "cus-existing" }) as never,
    );

    await createSubscription(null, makeFormData());

    expect(vi.mocked(createAsaasCustomer)).not.toHaveBeenCalled();
  });
});

describe("createSubscription() — subscription creation and persistence", () => {
  beforeEach(() => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: "cus-existing" }) as never,
    );
  });

  it("persists subscriptionId to DB (webhook will use this to find barbershop)", async () => {
    await createSubscription(null, makeFormData());

    // C2 (P1-B): persistência via compare-and-swap. O where casa o valor lido
    // (asaasSubscriptionId: null no makeBarbershop default) — valida o CAS, não
    // apenas "foi chamado".
    expect(vi.mocked(db.barbershop.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: SHOP_A,
          asaasSubscriptionId: null,
        }),
        // Grava também o plano na criação da assinatura (não mais só no webhook).
        data: { asaasSubscriptionId: "sub-new", plan: "pro" },
      }),
    );
  });

  it("does NOT activate plan immediately — waits for webhook PAYMENT_CONFIRMED", async () => {
    await createSubscription(null, makeFormData());

    // planStatus must NOT be in the CAS persistence data at this point
    const call = vi.mocked(db.barbershop.updateMany).mock.calls.find(
      (c) => "asaasSubscriptionId" in (c[0].data ?? {}),
    );
    expect(call?.[0].data).not.toHaveProperty("planStatus");
  });

  it("uses trialEndsAt as nextDueDate when trial is still valid", async () => {
    const futureTrialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({
        asaasCustomerId: "cus-existing",
        trialEndsAt: futureTrialEnd,
      }) as never,
    );

    await createSubscription(null, makeFormData());

    const expectedDate = futureTrialEnd.toISOString().split("T")[0];
    expect(vi.mocked(createAsaasSubscription)).toHaveBeenCalledWith(
      expect.objectContaining({ nextDueDate: expectedDate }),
    );
  });

  it("uses now+3 days as nextDueDate when trial already expired", async () => {
    const pastTrialEnd = new Date("2020-01-01");
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({
        asaasCustomerId: "cus-existing",
        trialEndsAt: pastTrialEnd,
      }) as never,
    );

    await createSubscription(null, makeFormData());

    const call = vi.mocked(createAsaasSubscription).mock.calls[0][0];
    // nextDueDate should be approximately 3 days from now
    const callDate = new Date(call.nextDueDate);
    const expected = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    // Allow 1-day tolerance for test execution time
    expect(Math.abs(callDate.getTime() - expected.getTime())).toBeLessThan(
      24 * 60 * 60 * 1000,
    );
  });

  it("uses MONTHLY cycle for monthly billing type", async () => {
    await createSubscription(null, makeFormData({ billingType: "monthly" }));

    expect(vi.mocked(createAsaasSubscription)).toHaveBeenCalledWith(
      expect.objectContaining({ cycle: "MONTHLY" }),
    );
  });

  it("uses YEARLY cycle for yearly billing type", async () => {
    await createSubscription(null, makeFormData({ billingType: "yearly" }));

    expect(vi.mocked(createAsaasSubscription)).toHaveBeenCalledWith(
      expect.objectContaining({ cycle: "YEARLY" }),
    );
  });
});

describe("createSubscription() — payment / pix result", () => {
  beforeEach(() => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: "cus-existing" }) as never,
    );
  });

  it("returns success with invoiceUrl and pix data when all Asaas calls succeed", async () => {
    const result = await createSubscription(null, makeFormData());

    expect(result.success).toBe(true);
    expect(result.invoiceUrl).toBe("https://invoice.example.com/pay-1");
    expect(result.pixPayload).toBe("pix-payload-string");
    expect(result.pixImage).toBe("base64-image-data");
  });

  it("returns success with invoiceUrl only when pix QR code fetch fails", async () => {
    vi.mocked(getChargePixQrCode).mockRejectedValue(new Error("pix unavailable"));

    const result = await createSubscription(null, makeFormData());

    expect(result.success).toBe(true);
    expect(result.invoiceUrl).toBe("https://invoice.example.com/pay-1");
    expect(result.pixPayload).toBeUndefined();
  });

  it("returns success with billingType only when no first payment exists", async () => {
    vi.mocked(getSubscriptionPayments).mockResolvedValue({ data: [] });

    const result = await createSubscription(null, makeFormData({ billingType: "yearly" }));

    expect(result.success).toBe(true);
    expect(result.billingType).toBe("yearly");
    expect(result.invoiceUrl).toBeUndefined();
  });

  it("returns generic error when Asaas API throws", async () => {
    vi.mocked(createAsaasSubscription).mockRejectedValue(
      new Error("Asaas API error: 500"),
    );

    const result = await createSubscription(null, makeFormData());

    expect(result.error).toContain("Erro ao criar assinatura");
    expect(result.success).toBeUndefined();
  });
});

describe("createSubscription() — observability", () => {
  it("logs billing.info when subscription is created successfully", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: "cus-existing" }) as never,
    );

    await createSubscription(null, makeFormData());

    expect(vi.mocked(log.billing.info)).toHaveBeenCalledWith(
      expect.stringContaining("assinatura"),
      expect.any(Object),
    );
  });

  it("logs billing.error when subscription creation fails", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop({ asaasCustomerId: "cus-existing" }) as never,
    );
    vi.mocked(createAsaasSubscription).mockRejectedValue(new Error("fail"));

    await createSubscription(null, makeFormData());

    expect(vi.mocked(log.billing.error)).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E4 — plano escolhido define preço/ciclo e é gravado no CAS
// ══════════════════════════════════════════════════════════════════════════════

describe("E4 — plano escolhido define preço e é gravado", () => {
  beforeEach(() => {
    vi.mocked(getCurrentMembership).mockResolvedValue(makeOwnerMembership());
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(
      makeBarbershop() as never,
    );
  });

  // Args passados ao createAsaasSubscription (value/cycle refletem plano+ciclo).
  function subArgs(): { value: number; cycle: string; description: string } {
    return vi.mocked(createAsaasSubscription).mock.calls[0][0] as never;
  }
  // data do updateMany do CAS (o que grava asaasSubscriptionId + plan).
  function casData(): { asaasSubscriptionId: string; plan: string } {
    const call = vi.mocked(db.barbershop.updateMany).mock.calls.find(
      (c) => "asaasSubscriptionId" in ((c[0].data ?? {}) as object),
    );
    return call?.[0].data as { asaasSubscriptionId: string; plan: string };
  }

  it("[caso 5] plan=start → value=59.90 (mensal) e CAS grava plan 'start'", async () => {
    await createSubscription(null, makeFormData({ plan: "start" }));

    const args = subArgs();
    expect(args.value).toBe(59.9);
    expect(args.cycle).toBe("MONTHLY");
    expect(casData().plan).toBe("start");
  });

  it("[caso 6] plan=start + billingType=yearly → coage p/ mensal (59.90, não anual)", async () => {
    await createSubscription(
      null,
      makeFormData({ plan: "start", billingType: "yearly" }),
    );

    const args = subArgs();
    expect(args.value).toBe(59.9); // START não tem anual → nunca usa preço anual
    expect(args.cycle).toBe("MONTHLY");
    expect(casData().plan).toBe("start");
  });

  it("[caso 7] plan=pro + billingType=yearly → value=1839.90 (anual) e CAS grava plan 'pro'", async () => {
    await createSubscription(
      null,
      makeFormData({ plan: "pro", billingType: "yearly" }),
    );

    const args = subArgs();
    expect(args.value).toBe(1839.9);
    expect(args.cycle).toBe("YEARLY");
    expect(casData().plan).toBe("pro");
  });

  it("[caso 8] plan adulterado → default seguro 'pro' (mensal 169.90)", async () => {
    await createSubscription(
      null,
      makeFormData({ plan: "premium_hacker" }),
    );

    const args = subArgs();
    expect(args.value).toBe(169.9);
    expect(casData().plan).toBe("pro");
  });
});
