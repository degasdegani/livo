import { fakerPT_BR as faker } from "@faker-js/faker";
import { Plan, PlanStatus, type Barbershop } from "@prisma/client";

export function makeBarbershop(overrides: Partial<Barbershop> = {}): Barbershop {
  const name = faker.company.name();
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return {
    id: faker.string.uuid(),
    name,
    slug,
    phone: faker.phone.number({ style: "national" }).replace(/\D/g, ""),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    plan: Plan.start,
    isActive: true,
    ownerId: faker.string.uuid(),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    asaasCustomerId: null,
    asaasSubscriptionId: null,
    planStatus: PlanStatus.trial,
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cep: faker.string.numeric(8),
    neighborhood: faker.location.secondaryAddress(),
    street: faker.location.street(),
    reopenPin: null,
    ...overrides,
  } as Barbershop;
}
