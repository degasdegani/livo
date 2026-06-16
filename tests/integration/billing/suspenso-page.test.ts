/**
 * TEST-05 — Billing: SuspensoPage redirects
 *
 * Tests src/app/(dashboard)/dashboard/suspenso/page.tsx
 *
 * The page has three gateway decisions:
 *   1. barbershop not found → /login
 *   2. active OR lifetime → /dashboard
 *   3. trial → /dashboard/assinar
 *   4. suspended OR cancelled → render (no redirect)
 *
 * Failure criterion:
 *   - Remove active guard → active user trapped on suspenso page
 *   - Remove trial redirect → trial user stranded instead of sent to payment page
 *   - Swap redirect targets → wrong page shown
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PlanStatus } from "@prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    barbershop: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// next/link renders as <a> so renderToStaticMarkup can produce HTML
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...rest }, children),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";

function mockMembership() {
  vi.mocked(requireMembership).mockResolvedValue({
    membershipId: "mem-1",
    userId: "user-1",
    role: "owner" as never,
    barbershopId: SHOP_A,
    professionalId: null,
  });
}

function mockBarbershop(planStatus: PlanStatus) {
  vi.mocked(db.barbershop.findUnique).mockResolvedValue({
    planStatus,
    name: "Barbearia Test",
  } as never);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockMembership();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("SuspensoPage — redirects", () => {
  it("redirects to /dashboard when plan is active", async () => {
    mockBarbershop(PlanStatus.active);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    await expect(SuspensoPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to /dashboard when plan is lifetime", async () => {
    mockBarbershop(PlanStatus.lifetime);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    await expect(SuspensoPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to /dashboard/assinar when plan is trial", async () => {
    mockBarbershop(PlanStatus.trial);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    await expect(SuspensoPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/assinar");
  });

  it("redirects to /login when barbershop not found", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    await expect(SuspensoPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });
});

describe("SuspensoPage — renders for billing failure states", () => {
  it("renders without redirect when plan is suspended", async () => {
    mockBarbershop(PlanStatus.suspended);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    const element = await SuspensoPage();

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
    expect(element).toBeTruthy();
  });

  it("renders without redirect when plan is cancelled", async () => {
    mockBarbershop(PlanStatus.cancelled);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    const element = await SuspensoPage();

    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
    expect(element).toBeTruthy();
  });

  it("shows 'ACESSO SUSPENSO' badge text for suspended plan", async () => {
    mockBarbershop(PlanStatus.suspended);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    const element = await SuspensoPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("ACESSO SUSPENSO");
  });

  it("shows 'ASSINATURA CANCELADA' badge text for cancelled plan", async () => {
    mockBarbershop(PlanStatus.cancelled);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    const element = await SuspensoPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("ASSINATURA CANCELADA");
  });

  it("links to /dashboard/assinar for reactivation", async () => {
    mockBarbershop(PlanStatus.suspended);

    const { default: SuspensoPage } = await import(
      "@/app/(dashboard)/dashboard/suspenso/page"
    );

    const element = await SuspensoPage();
    const html = renderToStaticMarkup(element as React.ReactElement);

    expect(html).toContain("/dashboard/assinar");
  });
});
