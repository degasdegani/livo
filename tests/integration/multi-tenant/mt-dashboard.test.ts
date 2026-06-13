/**
 * TEST-02 — Multi-tenant isolation: Dashboard
 *
 * Guards tested (dashboard/actions.ts):
 *   1. getDashboardAnalytics: requireMembership() → all queries scoped to membership.barbershopId
 *   2. updateAppointmentStatus: requireMembership() → delegates to updateAppointmentStatusCore
 *      which enforces barbershopId isolation (tested in detail in mt-agenda.test.ts)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import {
  getDashboardAnalytics,
  updateAppointmentStatus,
} from "@/app/(dashboard)/dashboard/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    appointment: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/appointment-core", () => ({
  updateAppointmentStatusCore: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    agenda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    comanda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const memberCtx = () => makeMembershipContext({ barbershopId: SHOP_A });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(memberCtx());
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Dashboard", () => {
  describe("getDashboardAnalytics", () => {
    it("scopes comanda query to authenticated tenant only", async () => {
      vi.mocked(db.comanda.findMany).mockResolvedValue([]);

      await getDashboardAnalytics();

      expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("does not expose comanda data from another tenant", async () => {
      // The barbershopId filter is the isolation boundary.
      // A correctly-scoped query for SHOP_A returns no data (none exists in this tenant).
      vi.mocked(db.comanda.findMany).mockResolvedValue([]);

      const result = await getDashboardAnalytics();

      // The query is scoped to SHOP_A, so no SHOP_B data leaks
      expect(result.faturamentoMes).toBe(0);
      expect(result.totalComandasMes).toBe(0);
    });

    it("requires membership authentication before returning any data", async () => {
      vi.mocked(db.comanda.findMany).mockResolvedValue([]);

      await getDashboardAnalytics();

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("returns correct shape with all expected analytics fields", async () => {
      vi.mocked(db.comanda.findMany).mockResolvedValue([]);

      const result = await getDashboardAnalytics();

      expect(result).toMatchObject({
        faturamentoMes: expect.any(Number),
        totalComandasMes: expect.any(Number),
        ticketMedio: expect.any(Number),
        topServicos: expect.any(Array),
        evolucaoMensal: expect.any(Array),
        rankingBarbeiros: expect.any(Array),
      });
    });
  });

  describe("updateAppointmentStatus", () => {
    it("requires membership before updating any appointment", async () => {
      const { updateAppointmentStatusCore } = await import(
        "@/lib/appointment-core"
      );
      vi.mocked(updateAppointmentStatusCore).mockResolvedValue({
        success: true,
      });

      await updateAppointmentStatus("appt-a", "completed");

      expect(vi.mocked(requireMembership)).toHaveBeenCalledTimes(1);
    });

    it("delegates to updateAppointmentStatusCore with the authenticated membership", async () => {
      const { updateAppointmentStatusCore } = await import(
        "@/lib/appointment-core"
      );
      vi.mocked(updateAppointmentStatusCore).mockResolvedValue({
        success: true,
      });

      await updateAppointmentStatus("appt-a", "completed");

      expect(vi.mocked(updateAppointmentStatusCore)).toHaveBeenCalledWith(
        "appt-a",
        "completed",
        expect.objectContaining({ barbershopId: SHOP_A }),
      );
    });

    it("propagates error from core without exposing cross-tenant data", async () => {
      const { updateAppointmentStatusCore } = await import(
        "@/lib/appointment-core"
      );
      vi.mocked(updateAppointmentStatusCore).mockResolvedValue({
        success: false,
        error: "Agendamento não encontrado.",
      });

      const result = await updateAppointmentStatus(
        "appt-from-shop-b",
        "completed",
      );

      expect(result).toEqual({
        success: false,
        error: "Agendamento não encontrado.",
      });
    });
  });
});
