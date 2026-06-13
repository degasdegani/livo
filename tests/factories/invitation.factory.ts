import { fakerPT_BR as faker } from "@faker-js/faker";
import { InvitationStatus, MemberRole, type Invitation } from "@prisma/client";

export function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    role: MemberRole.barber,
    token: faker.string.alphanumeric(32),
    status: InvitationStatus.pending,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    professionalId: null,
    commissionOnServices: false,
    commissionOnProducts: false,
    barbershopId: faker.string.uuid(),
    invitedById: faker.string.uuid(),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    acceptedAt: null,
    ...overrides,
  };
}
