import { fakerPT_BR as faker } from "@faker-js/faker";
import type { Service } from "@prisma/client";

export function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement(["Corte", "Barba", "Corte + Barba", "Sobrancelha"]),
    description: null,
    durationMin: faker.helpers.arrayElement([30, 45, 60, 90]),
    priceInCents: faker.number.int({ min: 2000, max: 8000 }),
    isActive: true,
    barbershopId: faker.string.uuid(),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}
