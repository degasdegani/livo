/**
 * TEST-05 — Billing: checkBillingAccess
 *
 * Tests src/lib/permissions.ts → checkBillingAccess()
 *
 * Failure criterion:
 *   - Remove lifetime guard → lifetime plan redirected incorrectly
 *   - Remove active guard → active plan redirected
 *   - Remove `planStatus: { not: lifetime }` check → trial expiry check changes
 *   - Change redirect targets → billing gates point to wrong pages
 *   - Remove trialEndsAt < now check → expired trial not blocked
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PlanStatus } from "@prisma/client";
import { checkBillingAccess } from "@/lib/permissions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

function mockBarbershop(planStatus: PlanStatus, trialEndsAt: Date | null = null) {
  vi.mocked(db.barbershop.findUnique).mockResolvedValue({
    planStatus,
    trialEndsAt,
  } as never);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("checkBillingAccess()", () => {
  it("passes without redirect for active plan", async () => {
    mockBarbershop(PlanStatus.active);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("passes without redirect for lifetime plan", async () => {
    mockBarbershop(PlanStatus.lifetime);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("passes without redirect for valid trial (trialEndsAt in the future)", async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    mockBarbershop(PlanStatus.trial, future);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("passes without redirect for trial with no trialEndsAt (indefinite trial)", async () => {
    mockBarbershop(PlanStatus.trial, null);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard/assinar when trial is expired", async () => {
    const past = new Date("2020-01-01");
    mockBarbershop(PlanStatus.trial, past);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/assinar");
  });

  it("redirects to /dashboard/suspenso when plan is suspended", async () => {
    mockBarbershop(PlanStatus.suspended);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/suspenso");
  });

  it("redirects to /dashboard/suspenso when plan is cancelled", async () => {
    mockBarbershop(PlanStatus.cancelled);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/suspenso");
  });

  it("redirects to /login when barbershop not found", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });

  it("queries barbershop by the provided barbershopId", async () => {
    mockBarbershop(PlanStatus.active);

    await checkBillingAccess("specific-shop-id");

    expect(vi.mocked(db.barbershop.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "specific-shop-id" },
      }),
    );
  });

  it("trial expired yesterday → must redirect, not pass", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockBarbershop(PlanStatus.trial, yesterday);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/assinar");
  });
});
