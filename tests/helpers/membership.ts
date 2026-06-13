import { vi } from "vitest";
import { MemberRole } from "@prisma/client";
import type { MembershipContext } from "@/lib/permissions";

export function makeMembershipContext(
  overrides: Partial<MembershipContext> = {},
): MembershipContext {
  return {
    membershipId: "mem-test-id-001",
    userId: "user-test-id-001",
    role: MemberRole.owner,
    barbershopId: "shop-test-id-001",
    professionalId: "prof-test-id-001",
    commissionOnServices: false,
    commissionOnProducts: false,
    ...overrides,
  };
}

/**
 * Returns a module-level mock factory for `@/lib/permissions`.
 * Use at the top level of your test file with `vi.mock`:
 *
 *   vi.mock("@/lib/permissions", () => createPermissionsMock());
 *   // or with a custom context:
 *   const ctx = makeMembershipContext({ role: MemberRole.barber });
 *   vi.mock("@/lib/permissions", () => createPermissionsMock(ctx));
 *
 * Never call vi.mock() inside a function — Vitest hoists all vi.mock() calls
 * to before any imports, so wrapping them in a function causes unexpected behavior.
 */
export function createPermissionsMock(ctx: MembershipContext = makeMembershipContext()) {
  return {
    requireMembership: vi.fn().mockResolvedValue(ctx),
    getCurrentMembership: vi.fn().mockResolvedValue(ctx),
    requireRole: vi.fn().mockResolvedValue(ctx),
    requireMembershipWithBilling: vi.fn().mockResolvedValue(ctx),
    checkBillingAccess: vi.fn().mockResolvedValue(undefined),
    isOwner: (m: MembershipContext) => m.role === "owner",
    canSeeAllClients: (m: MembershipContext) =>
      m.role === "owner" || m.role === "reception",
    clientScope: vi.fn().mockReturnValue({ barbershopId: ctx.barbershopId }),
    appointmentScope: vi.fn().mockReturnValue({ barbershopId: ctx.barbershopId }),
  };
}
