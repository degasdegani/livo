/**
 * TEST-04 — Agenda: Public booking actions + GAP-05 timezone
 *
 * Tests src/app/[slug]/book/actions.ts
 *   - getAvailableSlots: service/businessHour lookup, appointment scoping, UTC→Brasília
 *   - createAppointment: input validation, service+professional by barbershopId, dateISO building
 *
 * GAP-05 failure criterion:
 *   - Remove `- 180` from UTC conversion → appointments mapped 3h forward → wrong slots blocked
 *   - Use getHours() instead of getUTCHours() → server timezone leaks into calculation
 *   - Remove barbershopId from appointment query → cross-tenant appointments contaminate slots
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  getAvailableSlots,
  createAppointment,
} from "@/app/[slug]/book/actions";
import { createAppointmentCore } from "@/lib/appointment-core";
import { makeService, makeProfessional } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    service: { findFirst: vi.fn(), findMany: vi.fn() },
    professional: { findFirst: vi.fn() },
    businessHour: { findFirst: vi.fn() },
    appointment: { findMany: vi.fn() },
    barbershop: { findUnique: vi.fn() },
  },
}));

// getClientIp() lê x-forwarded-for via next/headers. Damos a cada teste um IP
// ÚNICO para isolar os rate limiters em memória (Map de módulo persiste entre
// testes e não é resetado por clearAllMocks). Sem isso, todas as chamadas
// compartilhariam o balde "unknown" e estourariam o limite ao longo do arquivo.
const ipHolder = vi.hoisted(() => ({ n: 0, ip: "10.0.0.1" }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => (key === "x-forwarded-for" ? ipHolder.ip : null),
  })),
}));

vi.mock("@/lib/appointment-core", () => ({
  createAppointmentCore: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendAppointmentConfirmation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const PROF_A = "prof-a";
const SVC_A = "svc-a";

const openBusinessHour = {
  id: "bh-1",
  barbershopId: SHOP_A,
  dayOfWeek: 3, // Wednesday
  isOpen: true,
  openTime: "09:00",
  closeTime: "18:00",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // IP único por teste → balde de rate limit próprio, sem acúmulo entre testes.
  ipHolder.n += 1;
  ipHolder.ip = `10.0.0.${ipHolder.n}`;
});

// ══════════════════════════════════════════════════════════════════════════════
// getAvailableSlots
// ══════════════════════════════════════════════════════════════════════════════

describe("getAvailableSlots()", () => {
  it("returns empty array when service not found in barbershop (cross-tenant guard)", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);

    const slots = await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: ["foreign-service-id"],
      date: "2020-01-01",
    });

    expect(slots).toEqual([]);
  });

  it("validates service by barbershopId — query must scope to barbershop", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);

    await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    expect(vi.mocked(db.service.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

  it("returns empty array when businessHour not configured for that day", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue(null);

    const slots = await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    expect(slots).toEqual([]);
  });

  it("returns empty array when barbershop is closed on that day", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue({
      ...openBusinessHour,
      isOpen: false,
    } as never);

    const slots = await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    expect(slots).toEqual([]);
  });

  it("scopes appointment query to barbershopId and professionalId", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue(
      openBusinessHour as never,
    );
    vi.mocked(db.appointment.findMany).mockResolvedValue([]);

    await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          barbershopId: SHOP_A,
          professionalId: PROF_A,
        }),
      }),
    );
  });

  it("excludes cancelled and no_show appointments from slot calculation", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue(
      openBusinessHour as never,
    );
    vi.mocked(db.appointment.findMany).mockResolvedValue([]);

    await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    expect(vi.mocked(db.appointment.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["cancelled", "no_show"] },
        }),
      }),
    );
  });

  it("returns slots when no appointments exist for the day", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue({
      ...openBusinessHour,
      openTime: "09:00",
      closeTime: "10:00",
    } as never);
    vi.mocked(db.appointment.findMany).mockResolvedValue([]);

    // 2020-01-01 is in the past → isToday=false → no past-blocking
    const slots = await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    // Window 09:00–10:00, service 30 min, SLOT_MINUTES=10 → 6 slots total
    // Available: 09:00,09:10,09:20,09:30 (fit before close); unavailable: 09:40,09:50
    expect(slots).toHaveLength(6);
    const availableTimes = slots.filter((s) => s.available).map((s) => s.time);
    expect(availableTimes).toHaveLength(4);
    expect(availableTimes).toContain("09:00");
    expect(availableTimes).toContain("09:30");
  });

  // GAP-05: appointments are stored in UTC; conversion to Brasília (UTC-3) is critical.
  // If `- 180` is missing, appointments shift +3 hours → wrong slots blocked.
  it("GAP-05: blocks 10:00 Brasília slot for appointment stored at 13:00 UTC", async () => {
    // Appointment stored as 13:00 UTC = 10:00 Brasília (UTC-3)
    // Correct conversion: 13*60 + 0 - 180 = 600 = 10:00
    // Without - 180: 13*60 = 780 = 13:00 (wrong → 10:00 would appear free)
    const apptDate = new Date("2020-01-01T13:00:00.000Z"); // 10:00 Brasília
    const apptEnd = new Date("2020-01-01T13:30:00.000Z"); // 10:30 Brasília

    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue({
      ...openBusinessHour,
      openTime: "09:00",
      closeTime: "12:00",
    } as never);
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { date: apptDate, endTime: apptEnd } as never,
    ]);

    const slots = await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    // 10:00 slot must be blocked by the 10:00–10:30 appointment
    const slot10 = slots.find((s) => s.time === "10:00");
    expect(slot10?.available).toBe(false);
    // 09:00 slot must be available (no conflict before 10:00)
    const slot09 = slots.find((s) => s.time === "09:00");
    expect(slot09?.available).toBe(true);
  });

  it("GAP-05: appointment endTime also converted via getUTCMinutes() - 180", async () => {
    // Appointment 09:30–10:30 Brasília = 12:30–13:30 UTC
    // startMinutes = 12*60+30 - 180 = 570 (09:30)
    // endMinutes   = 13*60+30 - 180 = 630 (10:30)
    // Slot 09:00 (540-570): slotEnd=570 NOT > startMinutes=570 → no conflict → available
    // Slot 10:00 (600-630): slotStart=600 < endMinutes=630 AND slotEnd=630 > startMinutes=570 → conflict
    const apptDate = new Date("2020-01-01T12:30:00.000Z"); // 09:30 Brasília
    const apptEnd = new Date("2020-01-01T13:30:00.000Z"); // 10:30 Brasília

    vi.mocked(db.service.findMany).mockResolvedValue([
      makeService({ durationMin: 30 }),
    ]);
    vi.mocked(db.businessHour.findFirst).mockResolvedValue({
      ...openBusinessHour,
      openTime: "09:00",
      closeTime: "12:00",
    } as never);
    vi.mocked(db.appointment.findMany).mockResolvedValue([
      { date: apptDate, endTime: apptEnd } as never,
    ]);

    const slots = await getAvailableSlots({
      barbershopId: SHOP_A,
      professionalId: PROF_A,
      serviceIds: [SVC_A],
      date: "2020-01-01",
    });

    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("09:30"); // conflicts: 570<630 && 600>570
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// createAppointment
// ══════════════════════════════════════════════════════════════════════════════

describe("createAppointment()", () => {
  const baseCreateData = {
    barbershopId: SHOP_A,
    professionalId: PROF_A,
    serviceIds: [SVC_A],
    date: "2026-06-15",
    time: "10:00",
    clientName: "João Silva",
    clientPhone: "11999999999",
  };

  it("returns error when clientName is empty", async () => {
    const result = await createAppointment({ ...baseCreateData, clientName: "" });
    expect(result.error).toBeDefined();
    expect(vi.mocked(createAppointmentCore)).not.toHaveBeenCalled();
  });

  it("returns error when clientName is only whitespace", async () => {
    const result = await createAppointment({
      ...baseCreateData,
      clientName: "   ",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when clientPhone is empty", async () => {
    const result = await createAppointment({ ...baseCreateData, clientPhone: "" });
    expect(result.error).toBeDefined();
    expect(vi.mocked(createAppointmentCore)).not.toHaveBeenCalled();
  });

  it("returns error when service not found in barbershop (cross-tenant guard)", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    const result = await createAppointment(baseCreateData);

    expect(result.error).toContain("Serviço não encontrado");
    expect(vi.mocked(createAppointmentCore)).not.toHaveBeenCalled();
  });

  it("validates service by barbershopId", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    await createAppointment(baseCreateData);

    expect(vi.mocked(db.service.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

  it("validates professional by barbershopId", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    await createAppointment(baseCreateData);

    expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

  it("delegates to createAppointmentCore with correct barbershopId and professionalId", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([makeService({ id: SVC_A })]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);
    vi.mocked(createAppointmentCore).mockResolvedValue({
      success: true,
      appointmentId: "new-appt-id",
    });

    await createAppointment(baseCreateData);

    expect(vi.mocked(createAppointmentCore)).toHaveBeenCalledWith(
      expect.objectContaining({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceIds: [SVC_A],
      }),
    );
  });

  it("builds dateISO with Brasília UTC-3 offset (GAP-05: dateISO must be 13:00Z for 10:00 local)", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([makeService({ id: SVC_A })]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);
    vi.mocked(createAppointmentCore).mockResolvedValue({
      success: true,
      appointmentId: "appt-1",
    });

    await createAppointment({ ...baseCreateData, date: "2026-06-15", time: "10:00" });

    // 10:00 Brasília (UTC-3) = 13:00 UTC
    const expectedDateISO = new Date("2026-06-15T10:00:00-03:00").toISOString();
    expect(vi.mocked(createAppointmentCore)).toHaveBeenCalledWith(
      expect.objectContaining({ dateISO: expectedDateISO }),
    );
  });

  it("propagates error from createAppointmentCore", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([makeService({ id: SVC_A })]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);
    vi.mocked(createAppointmentCore).mockResolvedValue({
      success: false,
      error: "Horário em conflito com outro agendamento.",
    });

    const result = await createAppointment(baseCreateData);

    expect(result.error).toContain("conflito");
    expect(result.success).toBeUndefined();
  });

  it("returns success with appointmentId when core succeeds", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([makeService({ id: SVC_A })]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(
      makeProfessional({ id: PROF_A }),
    );
    vi.mocked(db.barbershop.findUnique).mockResolvedValue({
      id: SHOP_A,
      name: "Barbearia Test",
      slug: "barbearia-test",
    } as never);
    vi.mocked(createAppointmentCore).mockResolvedValue({
      success: true,
      appointmentId: "new-appt-id",
    });

    const result = await createAppointment(baseCreateData);

    expect(result.success).toBe(true);
    expect(result.appointmentId).toBe("new-appt-id");
  });

  it("sets appointment status as confirmed in public booking flow", async () => {
    vi.mocked(db.service.findMany).mockResolvedValue([makeService({ id: SVC_A })]);
    vi.mocked(db.professional.findFirst).mockResolvedValue(null);
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);
    vi.mocked(createAppointmentCore).mockResolvedValue({
      success: true,
      appointmentId: "appt-1",
    });

    await createAppointment(baseCreateData);

    expect(vi.mocked(createAppointmentCore)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "confirmed" }),
    );
  });
});
