/**
 * TEST-02 — Multi-tenant isolation: Agenda / Appointment Core
 *
 * Guards tested:
 *   1. updateAppointmentStatusCore: findFirst({ where: { id, barbershopId } })
 *   2. updateAppointmentCore: both appointment and service validated against barbershopId
 *   3. moveAppointmentCore: appointment AND professional validated against barbershopId
 *   4. createAppointmentCore: service validated against barbershopId (caller-provided)
 *   5. Barber role: restricted to own appointments via professionalId check
 *
 * The core functions receive auth context as a parameter — no requireMembership()
 * call inside. Tenant isolation is entirely via the barbershopId in that context.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  updateAppointmentStatusCore,
  updateAppointmentCore,
  moveAppointmentCore,
  createAppointmentCore,
} from "@/lib/appointment-core";
import { makeMembershipContext } from "../../helpers/membership";
import { makeAppointment, makeService, makeProfessional } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    appointment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    service: { findFirst: vi.fn() },
    professional: { findFirst: vi.fn() },
    client: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    comanda: { updateMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const SHOP_B = "shop-tenant-b";

const authA = makeMembershipContext({ barbershopId: SHOP_A }).valueOf() as ReturnType<typeof makeMembershipContext>;

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: transaction calls the callback synchronously
  vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return fn(db);
    return Promise.all(fn as Promise<unknown>[]);
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Agenda / Appointment Core", () => {
  describe("updateAppointmentStatusCore", () => {
    it("returns error when appointment belongs to another tenant", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      const result = await updateAppointmentStatusCore(
        "appt-from-shop-b",
        "completed",
        authA,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Agendamento não encontrado.");
    });

    it("scopes findFirst to authenticated barbershopId", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      await updateAppointmentStatusCore("appt-from-shop-b", "completed", authA);

      expect(vi.mocked(db.appointment.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("blocks barber from updating another barber's appointment", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      const barberCtx = makeMembershipContext({
        barbershopId: SHOP_A,
        role: "barber",
        professionalId: "prof-a1",
      });

      // Appointment exists but belongs to a different professional in same shop
      vi.mocked(db.appointment.findFirst).mockResolvedValue(
        makeAppointment({ barbershopId: SHOP_A, professionalId: "prof-a2" }),
      );

      const result = await updateAppointmentStatusCore(
        "appt-a",
        "completed",
        barberCtx,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sem permissão para este agendamento.");
    });
  });

  describe("updateAppointmentCore", () => {
    it("returns error when appointment belongs to another tenant", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      const result = await updateAppointmentCore(
        {
          appointmentId: "appt-from-shop-b",
          serviceId: "svc-a",
          dateISO: new Date().toISOString(),
          clientName: "Test",
          clientPhone: "11999999999",
        },
        authA,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Agendamento não encontrado.");
    });

    it("scopes appointment lookup to authenticated barbershopId", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      await updateAppointmentCore(
        {
          appointmentId: "appt-from-shop-b",
          serviceId: "svc-a",
          dateISO: new Date().toISOString(),
          clientName: "Test",
          clientPhone: "11999999999",
        },
        authA,
      );

      expect(vi.mocked(db.appointment.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("rejects service from another tenant when editing appointment", async () => {
      // Appointment found in correct tenant
      vi.mocked(db.appointment.findFirst).mockResolvedValue(
        makeAppointment({ barbershopId: SHOP_A, status: "pending" }),
      );
      // But service belongs to another tenant → findFirst returns null
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      const result = await updateAppointmentCore(
        {
          appointmentId: "appt-a",
          serviceId: "svc-from-shop-b",
          dateISO: new Date().toISOString(),
          clientName: "Test",
          clientPhone: "11999999999",
        },
        authA,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Serviço não encontrado.");

      // Service lookup scoped to same barbershopId as appointment
      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("moveAppointmentCore", () => {
    it("returns error when appointment belongs to another tenant", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      const result = await moveAppointmentCore(
        { appointmentId: "appt-from-shop-b", newProfessionalId: "prof-a" },
        authA,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Agendamento não encontrado.");
    });

    it("rejects professional from another tenant as move target", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(
        makeAppointment({ barbershopId: SHOP_A, professionalId: "prof-a1", status: "pending" }),
      );
      // Target professional not found in SHOP_A
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      const result = await moveAppointmentCore(
        {
          appointmentId: "appt-a",
          newProfessionalId: "prof-from-shop-b",
        },
        authA,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Profissional não encontrado.");

      // Professional lookup must include barbershopId
      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("createAppointmentCore", () => {
    it("rejects serviceId from another tenant", async () => {
      // Service not found because barbershopId doesn't match
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      const result = await createAppointmentCore({
        barbershopId: SHOP_A,
        professionalId: "prof-a",
        serviceId: "svc-from-shop-b",
        dateISO: new Date().toISOString(),
        clientName: "Test",
        clientPhone: "11999999999",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Serviço não encontrado.");

      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barbershopId: SHOP_A,
            id: "svc-from-shop-b",
          }),
        }),
      );
    });

    it("creates appointment only when service belongs to correct tenant", async () => {
      const svc = makeService({ barbershopId: SHOP_A, durationMin: 30 });
      vi.mocked(db.service.findFirst).mockResolvedValue(svc);
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null); // no conflict
      vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
        const txDb = {
          ...db,
          client: {
            ...db.client,
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "new-client-id" }),
          },
          appointment: {
            ...db.appointment,
            create: vi.fn().mockResolvedValue({ id: "new-appt-id" }),
          },
        };
        if (typeof fn === "function") return fn(txDb);
        return Promise.all(fn as Promise<unknown>[]);
      });

      const result = await createAppointmentCore({
        barbershopId: SHOP_A,
        professionalId: "prof-a",
        serviceId: svc.id,
        dateISO: new Date().toISOString(),
        clientName: "Test",
        clientPhone: "11999999999",
      });

      expect(result.success).toBe(true);
    });
  });
});
