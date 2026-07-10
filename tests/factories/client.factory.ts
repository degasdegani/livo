import { fakerPT_BR as faker } from "@faker-js/faker";
import type { Client } from "@prisma/client";

export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number({ style: "national" }).replace(/\D/g, ""),
    email: null,
    notes: null,
    barbershopId: faker.string.uuid(),
    totalVisits: 0,
    lastVisitAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    birthDate: null,
    bloqueado: false,
    cep: null,
    cpf: null,
    neighborhood: null,
    origem: null,
    street: null,
    anonymizedAt: null,
    ...overrides,
  };
}
