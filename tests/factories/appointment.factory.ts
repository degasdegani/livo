import { fakerPT_BR as faker } from "@faker-js/faker";
import { AppointmentStatus, type Appointment } from "@prisma/client";

export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  const date = new Date("2024-06-01T10:00:00.000Z");
  const endTime = new Date("2024-06-01T10:30:00.000Z");

  return {
    id: faker.string.uuid(),
    date,
    endTime,
    status: AppointmentStatus.pending,
    notes: null,
    clientName: faker.person.fullName(),
    clientPhone: faker.phone.number({ style: "national" }).replace(/\D/g, ""),
    clientEmail: null,
    barbershopId: faker.string.uuid(),
    professionalId: faker.string.uuid(),
    serviceId: faker.string.uuid(),
    clientId: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    notificationSentAt: null,
    reminderSentAt: null,
    noShowReportedAt: null,
    ...overrides,
  };
}
