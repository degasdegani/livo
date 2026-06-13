/**
 * TEST-02 — Multi-tenant isolation: Public Booking
 *
 * Guards tested ([slug]/book/actions.ts):
 *   1. getAvailableSlots: service lookup scoped to { id, barbershopId } — rejects
 *      a serviceId that belongs to a different barbershopId
 *   2. getAvailableSlots: appointment lookup scoped to { barbershopId, professionalId }
 *   3. createAppointment: service AND professional lookups both use barbershopId from URL param
 *   4. createAppointment: delegates to createAppointmentCore with same barbershopId
 *
 * Note: public booking is unauthenticated. The barbershopId is derived from the
 * slug in the URL and passed as a parameter — it cannot be forged to a different
 * tenant because service/professional lookups will fail if IDs don't belong to it.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  getAvailableSlots,
  createAppointment,
} from "@/app/[slug]/book/actions";
import { makeService, makeProfessional } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    service: { findFirst: vi.fn() },
    professional: { findFirst: vi.fn() },
    barbershop: { findUnique: vi.fn() },
    businessHour: { findFirst: vi.fn() },
    appointment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    client: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    comanda: { updateMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/appointment-core", () => ({
  createAppointmentCore: vi.fn(),
}));

vi.mock("@/lib/availability", () => ({
  generateAvailableSlots: vi.fn().mockReturnValue(["09:00", "09:30"]),
}));

vi.mock("@/lib/email", () => ({
  sendAppointmentConfirmation: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const SHOP_B = "shop-tenant-b";
const PROF_A = "prof-in-shop-a";
const SVC_A = "svc-in-shop-a";
const SVC_B = "svc-in-shop-b";

const TODAY = "2026-01-15";

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return fn(db);
    return Promise.all(fn as Promise<unknown>[]);
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Public Booking", () => {
  describe("getAvailableSlots", () => {
    it("returns empty array when service does not belong to the requested barbershopId", async () => {
      // Service from SHOP_B is NOT found under SHOP_A → returns []
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      const slots = await getAvailableSlots({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_B, // Cross-tenant serviceId
        date: TODAY,
      });

      expect(slots).toEqual([]);
    });

    it("scopes service lookup to the URL-provided barbershopId", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      await getAvailableSlots({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_B,
        date: TODAY,
      });

      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: SVC_B,
            barbershopId: SHOP_A,
          }),
        }),
      );
    });

    it("scopes appointment lookup to both barbershopId and professionalId", async () => {
      const svc = makeService({ id: SVC_A, barbershopId: SHOP_A, durationMin: 30 });
      vi.mocked(db.service.findFirst).mockResolvedValue(svc);
      vi.mocked(db.businessHour.findFirst).mockResolvedValue({
        id: "bh-1",
        barbershopId: SHOP_A,
        dayOfWeek: new Date(TODAY).getDay(),
        isOpen: true,
        openTime: "09:00",
        closeTime: "18:00",
      });
      vi.mocked(db.appointment.findMany).mockResolvedValue([]);

      await getAvailableSlots({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_A,
        date: TODAY,
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
  });

  describe("createAppointment", () => {
    it("returns error when service does not belong to the provided barbershopId", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null); // Cross-tenant service
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);
      vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

      const result = await createAppointment({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_B, // Belongs to SHOP_B
        date: TODAY,
        time: "10:00",
        clientName: "Test Client",
        clientPhone: "11999999999",
      });

      expect(result).toEqual({ error: "Serviço não encontrado." });
    });

    it("scopes service and professional lookups to the URL-provided barbershopId", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);
      vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

      await createAppointment({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_A,
        date: TODAY,
        time: "10:00",
        clientName: "Test Client",
        clientPhone: "11999999999",
      });

      // Both service and professional must be validated against SHOP_A
      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("delegates to createAppointmentCore with the validated barbershopId", async () => {
      const svc = makeService({ id: SVC_A, barbershopId: SHOP_A, durationMin: 30 });
      const prof = makeProfessional({ id: PROF_A, barbershopId: SHOP_A });

      vi.mocked(db.service.findFirst).mockResolvedValue(svc);
      vi.mocked(db.professional.findFirst).mockResolvedValue(prof);
      vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

      const { createAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(createAppointmentCore).mockResolvedValue({
        success: true,
        appointmentId: "new-appt-id",
      });

      await createAppointment({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_A,
        date: TODAY,
        time: "10:00",
        clientName: "Test Client",
        clientPhone: "11999999999",
      });

      expect(vi.mocked(createAppointmentCore)).toHaveBeenCalledWith(
        expect.objectContaining({
          barbershopId: SHOP_A, // Verified: uses the URL-derived barbershopId
        }),
      );
    });

    it("cannot book across tenant boundaries — different barbershopId for service vs booking", async () => {
      // Lookup scoped to SHOP_A returns null for SVC_B — the service belongs to SHOP_B
      vi.mocked(db.service.findFirst).mockResolvedValue(null);
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);
      vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

      const result = await createAppointment({
        barbershopId: SHOP_A,
        professionalId: PROF_A,
        serviceId: SVC_B, // Cross-tenant service ID
        date: TODAY,
        time: "10:00",
        clientName: "Attacker",
        clientPhone: "11999999999",
      });

      expect(result.error).toBe("Serviço não encontrado.");
    });
  });
});
