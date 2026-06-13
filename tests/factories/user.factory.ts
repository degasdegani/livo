import { fakerPT_BR as faker } from "@faker-js/faker";
import type { User } from "@prisma/client";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    emailVerified: null,
    image: null,
    password: "$2a$10$hashedpasswordfortests",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    birthDate: null,
    cpf: null,
    ...overrides,
  };
}
