/**
 * TEST-03 — RBAC: Core permissions module
 *
 * Tests src/lib/permissions.ts in isolation.
 * Mocks: @/auth, @/lib/db, next/navigation (redirect throws).
 *
 * Failure criterion:
 *   - Removing a role check from requireRole() → role assertion fails
 *   - Changing the redirect target → path assertion fails
 *   - Widening clientScope/appointmentScope → structure assertion fails
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { MemberRole, PlanStatus } from "@prisma/client";
import {
  getCurrentMembership,
  requireMembership,
  requireRole,
  requireMembershipWithBilling,
  checkBillingAccess,
  isOwner,
  canSeeAllClients,
  clientScope,
  appointmentScope,
} from "@/lib/permissions";
import { makeMembershipContext } from "../../helpers/membership";
import { makeMembership } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findFirst: vi.fn() },
    barbershop: { findUnique: vi.fn() },
  },
}));

// redirect() throws in production — replicate that so guards work correctly in tests
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const SHOP_A = "shop-test-a";

function mockSession(userId: string | null) {
  vi.mocked(auth).mockResolvedValue(
    (userId ? { user: { id: userId } } : null) as never,
  );
}

function mockDbMembership(role: MemberRole | null) {
  if (!role) {
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);
    return;
  }
  vi.mocked(db.membership.findFirst).mockResolvedValue(
    makeMembership({
      userId: "user-id",
      barbershopId: SHOP_A,
      role,
      professionalId: role === MemberRole.barber ? "prof-id" : null,
      isActive: true,
    }),
  );
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getCurrentMembership ───────────────────────────────────────────────────────

describe("getCurrentMembership()", () => {
  it("returns null when there is no session", async () => {
    mockSession(null);

    const result = await getCurrentMembership();

    expect(result).toBeNull();
  });

  it("returns null when session exists but user has no active membership", async () => {
    mockSession("user-id");
    mockDbMembership(null);

    const result = await getCurrentMembership();

    expect(result).toBeNull();
  });

  it("returns MembershipContext when session and membership exist", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.owner);

    const result = await getCurrentMembership();

    expect(result).toMatchObject({
      userId: "user-id",
      role: MemberRole.owner,
      barbershopId: SHOP_A,
    });
  });

  it("looks up membership by userId with isActive:true filter", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.owner);

    await getCurrentMembership();

    expect(vi.mocked(db.membership.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-id", isActive: true }),
      }),
    );
  });
});

// ── requireMembership ──────────────────────────────────────────────────────────

describe("requireMembership()", () => {
  it("redirects to /login when no session exists", async () => {
    mockSession(null);

    await expect(requireMembership()).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session exists but membership is missing", async () => {
    mockSession("user-id");
    mockDbMembership(null);

    await expect(requireMembership()).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });

  it("returns MembershipContext for an authenticated owner", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.owner);

    const ctx = await requireMembership();

    expect(ctx.role).toBe(MemberRole.owner);
    expect(ctx.barbershopId).toBe(SHOP_A);
  });

  it("returns MembershipContext for an authenticated receptionist", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.reception);

    const ctx = await requireMembership();

    expect(ctx.role).toBe(MemberRole.reception);
  });

  it("returns MembershipContext for an authenticated barber", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.barber);

    const ctx = await requireMembership();

    expect(ctx.role).toBe(MemberRole.barber);
  });
});

// ── requireRole ───────────────────────────────────────────────────────────────

describe('requireRole("owner")', () => {
  it("grants access to owner", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.owner);

    const ctx = await requireRole("owner");

    expect(ctx.role).toBe(MemberRole.owner);
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("redirects receptionist to /dashboard", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.reception);

    await expect(requireRole("owner")).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects barber to /dashboard", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.barber);

    await expect(requireRole("owner")).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });
});

describe('requireRole(["owner","reception"])', () => {
  it("grants access to owner", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.owner);

    const ctx = await requireRole(["owner", "reception"]);

    expect(ctx.role).toBe(MemberRole.owner);
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("grants access to receptionist", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.reception);

    const ctx = await requireRole(["owner", "reception"]);

    expect(ctx.role).toBe(MemberRole.reception);
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("redirects barber to /dashboard", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.barber);

    await expect(requireRole(["owner", "reception"])).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });
});

// ── checkBillingAccess ────────────────────────────────────────────────────────

describe("checkBillingAccess()", () => {
  it("passes for active subscription", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.active,
      trialEndsAt: null,
    } as never);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("passes for lifetime plan", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.lifetime,
      trialEndsAt: null,
    } as never);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("passes for valid trial (not yet expired)", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.trial,
      trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days ahead
    } as never);

    await expect(checkBillingAccess(SHOP_A)).resolves.toBeUndefined();
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard/assinar when trial is expired", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.trial,
      trialEndsAt: new Date("2020-01-01"), // past date
    } as never);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/assinar");
  });

  it("redirects to /dashboard/suspenso when plan is suspended", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.suspended,
      trialEndsAt: null,
    } as never);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/suspenso");
  });

  it("redirects to /dashboard/suspenso when plan is cancelled", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.cancelled,
      trialEndsAt: null,
    } as never);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/suspenso");
  });

  it("redirects to /login when barbershop is not found", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    await expect(checkBillingAccess(SHOP_A)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });
});

// ── requireMembershipWithBilling ──────────────────────────────────────────────

describe("requireMembershipWithBilling()", () => {
  it("checks billing access for owner role", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.owner);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      planStatus: PlanStatus.active,
      trialEndsAt: null,
    } as never);

    const ctx = await requireMembershipWithBilling();

    expect(ctx.role).toBe(MemberRole.owner);
    expect(vi.mocked(db.barbershop.findUnique)).toHaveBeenCalled();
  });

  it("skips billing check for receptionist — only owner pays", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.reception);

    const ctx = await requireMembershipWithBilling();

    expect(ctx.role).toBe(MemberRole.reception);
    expect(vi.mocked(db.barbershop.findUnique)).not.toHaveBeenCalled();
  });

  it("skips billing check for barber — only owner pays", async () => {
    mockSession("user-id");
    mockDbMembership(MemberRole.barber);

    const ctx = await requireMembershipWithBilling();

    expect(ctx.role).toBe(MemberRole.barber);
    expect(vi.mocked(db.barbershop.findUnique)).not.toHaveBeenCalled();
  });
});

// ── Scope helpers ─────────────────────────────────────────────────────────────

describe("isOwner()", () => {
  it("returns true for owner", () => {
    expect(isOwner(makeMembershipContext({ role: MemberRole.owner }))).toBe(true);
  });

  it("returns false for receptionist", () => {
    expect(isOwner(makeMembershipContext({ role: MemberRole.reception }))).toBe(false);
  });

  it("returns false for barber", () => {
    expect(isOwner(makeMembershipContext({ role: MemberRole.barber }))).toBe(false);
  });
});

describe("canSeeAllClients()", () => {
  it("returns true for owner", () => {
    expect(canSeeAllClients(makeMembershipContext({ role: MemberRole.owner }))).toBe(true);
  });

  it("returns true for receptionist", () => {
    expect(canSeeAllClients(makeMembershipContext({ role: MemberRole.reception }))).toBe(true);
  });

  it("returns false for barber — barber sees only own clients", () => {
    expect(canSeeAllClients(makeMembershipContext({ role: MemberRole.barber }))).toBe(false);
  });
});

describe("clientScope()", () => {
  it("returns broad barbershopId-only scope for owner", () => {
    const scope = clientScope(makeMembershipContext({ role: MemberRole.owner, barbershopId: SHOP_A }));

    expect(scope).toEqual({ barbershopId: SHOP_A });
  });

  it("returns broad barbershopId-only scope for receptionist", () => {
    const scope = clientScope(makeMembershipContext({ role: MemberRole.reception, barbershopId: SHOP_A }));

    expect(scope).toEqual({ barbershopId: SHOP_A });
  });

  it("returns restricted scope for barber — limited to own appointments", () => {
    const ctx = makeMembershipContext({
      role: MemberRole.barber,
      barbershopId: SHOP_A,
      professionalId: "prof-barber",
    });

    const scope = clientScope(ctx);

    expect(scope).toMatchObject({
      barbershopId: SHOP_A,
      appointments: { some: { professionalId: "prof-barber" } },
    });
  });
});

describe("appointmentScope()", () => {
  it("returns broad scope for owner", () => {
    const scope = appointmentScope(makeMembershipContext({ role: MemberRole.owner, barbershopId: SHOP_A }));

    expect(scope).toEqual({ barbershopId: SHOP_A });
  });

  it("returns broad scope for receptionist", () => {
    const scope = appointmentScope(makeMembershipContext({ role: MemberRole.reception, barbershopId: SHOP_A }));

    expect(scope).toEqual({ barbershopId: SHOP_A });
  });

  it("returns restricted scope for barber — own appointments only", () => {
    const ctx = makeMembershipContext({
      role: MemberRole.barber,
      barbershopId: SHOP_A,
      professionalId: "prof-barber",
    });

    const scope = appointmentScope(ctx);

    expect(scope).toEqual({
      barbershopId: SHOP_A,
      professionalId: "prof-barber",
    });
  });
});
