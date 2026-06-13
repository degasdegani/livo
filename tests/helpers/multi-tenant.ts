import { fakerPT_BR as faker } from "@faker-js/faker";
import { makeMembershipContext } from "./membership";
import type { MembershipContext } from "@/lib/permissions";

export type TenantContext = {
  barbershopId: string;
  userId: string;
  membershipId: string;
  membership: MembershipContext;
};

/**
 * Creates an isolated tenant context with deterministic or random IDs.
 * Use when a test needs to represent a single tenant.
 */
export function createTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
  const barbershopId = overrides.barbershopId ?? faker.string.uuid();
  const userId = overrides.userId ?? faker.string.uuid();
  const membershipId = overrides.membershipId ?? faker.string.uuid();

  const membership = makeMembershipContext({
    barbershopId,
    userId,
    membershipId,
    ...overrides.membership,
  });

  return { barbershopId, userId, membershipId, membership };
}

/**
 * Creates two completely isolated tenant contexts.
 * Use in tests that verify data cannot bleed across barbershops.
 */
export function createTwoTenants(): { tenantA: TenantContext; tenantB: TenantContext } {
  const tenantA = createTenantContext();
  const tenantB = createTenantContext();
  // Guarantee IDs never collide
  if (tenantA.barbershopId === tenantB.barbershopId) {
    return createTwoTenants();
  }
  return { tenantA, tenantB };
}

/**
 * Builds a Prisma-compatible WHERE clause that scopes a query to a barbershop.
 * Mirrors the pattern used throughout production server actions.
 */
export function tenantScope(barbershopId: string) {
  return { barbershopId };
}
