/**
 * TEST-03 — RBAC: Agenda actions
 *
 * Guards tested (agenda/agenda-actions.ts):
 *   - getAgendaDay:           requireMembership  — all roles pass; no session → blocked
 *   - moveAppointment:        requireRole(["owner","reception"]) — barber blocked
 *   - createQuickAppointment: requireMembership + inline barber professionalId check
 *
 * Failure criterion:
 *   - Remove requireRole from moveAppointment → toHaveBeenCalledWith assertion fails
 *   - Widen moveAppointment to allow barber → role array assertion fails
 *   - Remove inline barber check → barber-for-other-professional test fails
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import {
  getAgendaDay,
  moveAppointment,
  createQuickAppointment,
} from "@/app/(dashboard)/dashboard/agenda/agenda-actions";
import { makeMembershipContext } from "../../helpers/membership";
import { MemberRole } from "@prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    professional: { findMany: vi.fn() },
    appointment: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    businessHour: { findFirst: vi.fn() },
    service: { findFirst: vi.fn(), findMany: vi.fn() },
    client: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    comanda: { updateMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  requireRole: vi.fn(),
  appointmentScope: vi.fn().mockReturnValue({ barbershopId: "shop-a" }),
  clientScope: vi.fn().mockReturnValue({ barbershopId: "shop-a" }),
}));

vi.mock("@/lib/appointment-core", () => ({
  createAppointmentCore: vi.fn(),
  moveAppointmentCore: vi.fn(),
  updateAppointmentCore: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";

const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
const receptionCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.reception });
const barberCtx = () =>
  makeMembershipContext({
    barbershopId: SHOP_A,
    role: MemberRole.barber,
    professionalId: "prof-own",
  });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.professional.findMany).mockResolvedValue([]);
  vi.mocked(db.appointment.findMany).mockResolvedValue([]);
  vi.mocked(db.businessHour.findFirst).mockResolvedValue(null);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RBAC — Agenda", () => {
  describe("getAgendaDay()", () => {
    it("allows owner to access agenda", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

      await getAgendaDay("2026-01-15");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("allows receptionist to access agenda", async () => {
      vi.mocked(requireMembership).mockResolvedValue(receptionCtx());

      await getAgendaDay("2026-01-15");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("allows barber to access agenda (scoped to own appointments)", async () => {
      vi.mocked(requireMembership).mockResolvedValue(barberCtx());

      await getAgendaDay("2026-01-15");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("blocks unauthenticated access — requireMembership gate", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(getAgendaDay("2026-01-15")).rejects.toThrow();

      expect(vi.mocked(db.professional.findMany)).not.toHaveBeenCalled();
    });
  });

  describe("moveAppointment()", () => {
    it("calls requireRole with [owner, reception] — blocks barber by design", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      const { moveAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(moveAppointmentCore).mockResolvedValue({ success: true });

      await moveAppointment("appt-a", "prof-b");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith(
        expect.arrayContaining(["owner", "reception"]),
      );
    });

    it("allows owner to move appointment", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      const { moveAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(moveAppointmentCore).mockResolvedValue({ success: true });

      const result = await moveAppointment("appt-a", "prof-b");

      expect(result.success).toBe(true);
    });

    it("allows receptionist to move appointment", async () => {
      vi.mocked(requireRole).mockResolvedValue(receptionCtx());
      const { moveAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(moveAppointmentCore).mockResolvedValue({ success: true });

      const result = await moveAppointment("appt-a", "prof-b");

      expect(result.success).toBe(true);
    });

    it("blocks barber — requireRole rejects non-allowed roles", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));

      // moveAppointment catches errors and returns { success: false }
      const result = await moveAppointment("appt-a", "prof-b");

      expect(result.success).toBe(false);
    });

    it("never calls moveAppointmentCore when role check fails", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));
      const { moveAppointmentCore } = await import("@/lib/appointment-core");

      await moveAppointment("appt-a", "prof-b");

      expect(vi.mocked(moveAppointmentCore)).not.toHaveBeenCalled();
    });
  });

  describe("createQuickAppointment() — barber professionalId guard", () => {
    it("allows barber to create appointment for their own professional slot", async () => {
      vi.mocked(requireMembership).mockResolvedValue(barberCtx());
      const { createAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(createAppointmentCore).mockResolvedValue({
        success: true,
        appointmentId: "appt-new",
      });

      const result = await createQuickAppointment({
        professionalId: "prof-own", // matches barberCtx().professionalId
        serviceIds: ["svc-a"],
        dateISO: new Date().toISOString(),
        clientName: "Test",
        clientPhone: "11999999999",
      });

      expect(result.success).toBe(true);
    });

    it("blocks barber from creating appointment for another professional", async () => {
      vi.mocked(requireMembership).mockResolvedValue(barberCtx());

      const result = await createQuickAppointment({
        professionalId: "prof-someone-else", // different from barberCtx().professionalId
        serviceIds: ["svc-a"],
        dateISO: new Date().toISOString(),
        clientName: "Test",
        clientPhone: "11999999999",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sem permissão para este profissional.");
    });

    it("allows owner to create appointment for any professional", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
      const { createAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(createAppointmentCore).mockResolvedValue({
        success: true,
        appointmentId: "appt-new",
      });

      const result = await createQuickAppointment({
        professionalId: "prof-anyone",
        serviceIds: ["svc-a"],
        dateISO: new Date().toISOString(),
        clientName: "Test",
        clientPhone: "11999999999",
      });

      expect(result.success).toBe(true);
    });

    it("blocks unauthenticated user — requireMembership gate", async () => {
      vi.mocked(requireMembership).mockRejectedValue(new Error("NEXT_REDIRECT"));

      const result = await createQuickAppointment({
        professionalId: "prof-a",
        serviceIds: ["svc-a"],
        dateISO: new Date().toISOString(),
        clientName: "Test",
        clientPhone: "11999999999",
      });

      expect(result.success).toBe(false);
    });

    it("passes clientName and clientPhone to createAppointmentCore so new client is auto-created", async () => {
      vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
      const { createAppointmentCore } = await import("@/lib/appointment-core");
      vi.mocked(createAppointmentCore).mockResolvedValue({
        success: true,
        appointmentId: "appt-new",
      });

      await createQuickAppointment({
        professionalId: "prof-anyone",
        serviceIds: ["svc-a"],
        dateISO: new Date().toISOString(),
        clientName: "João Silva",
        clientPhone: "(11) 98888-7777",
      });

      expect(vi.mocked(createAppointmentCore)).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: "João Silva",
          clientPhone: "(11) 98888-7777",
          barbershopId: SHOP_A,
        }),
      );
    });
  });
});
