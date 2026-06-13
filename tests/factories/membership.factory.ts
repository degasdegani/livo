import { fakerPT_BR as faker } from "@faker-js/faker";
import { MemberRole, type Membership } from "@prisma/client";

export function makeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: faker.string.uuid(),
    role: MemberRole.owner,
    userId: faker.string.uuid(),
    barbershopId: faker.string.uuid(),
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    // Decimal fields — null satisfies Decimal | null
    commissionServicePct: null,
    commissionProductPct: null,
    ...overrides,
  };
}
