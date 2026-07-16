import { fakerPT_BR as faker } from "@faker-js/faker";
import type { Professional } from "@prisma/client";

export function makeProfessional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    bio: null,
    avatarUrl: null,
    isActive: true,
    barbershopId: faker.string.uuid(),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    commissionOnServices: false,
    commissionOnProducts: false,
    // Decimal fields — null satisfies Decimal | null
    commissionServicePct: null,
    commissionProductPct: null,
    yearStarted: null,
    specialties: [],
    // Decimal field — null satisfies Decimal | null
    avgRating: null,
    reviewCount: 0,
    ...overrides,
  };
}
