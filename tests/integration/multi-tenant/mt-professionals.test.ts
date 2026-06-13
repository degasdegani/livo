/**
 * TEST-02 — Multi-tenant isolation: Professionals
 *
 * Guards tested (profissionais/actions.ts):
 *   1. requireRole("owner") on every mutation
 *   2. professional findFirst({ where: { id, barbershopId } }) before any write
 *   3. createProfessional: new professional is always created with membership.barbershopId
 *   4. getProfessionalsData: query scoped to membership.barbershopId
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  updateProfessional,
  deleteProfessional,
  toggleProfessionalActive,
  createProfessional,
  getProfessionalsData,
} from "@/app/(dashboard)/dashboard/profissionais/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { makeProfessional } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    professional: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    appointment: { count: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const PROF_B = "prof-from-shop-b";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: "owner" });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Professionals", () => {
  describe("updateProfessional", () => {
    it("returns error when professional belongs to another tenant", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      const result = await updateProfessional(PROF_B, { name: "Hacker" });

      expect(result).toEqual({
        success: false,
        error: "Profissional não encontrado.",
      });
    });

    it("scopes professional lookup to authenticated owner's tenant", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await updateProfessional(PROF_B, { name: "Hacker" });

      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("never updates without verifying ownership first", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await updateProfessional(PROF_B, { name: "Hacker" });

      expect(vi.mocked(db.professional.update)).not.toHaveBeenCalled();
    });

    it("requires owner role before any professional operation", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await updateProfessional(PROF_B, { name: "X" });

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });
  });

  describe("deleteProfessional", () => {
    it("returns error when professional belongs to another tenant", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      const result = await deleteProfessional(PROF_B);

      expect(result).toEqual({
        success: false,
        error: "Profissional não encontrado.",
      });
    });

    it("scopes professional lookup to authenticated owner's tenant", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await deleteProfessional(PROF_B);

      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("never deletes without verifying ownership first", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await deleteProfessional(PROF_B);

      expect(vi.mocked(db.professional.delete)).not.toHaveBeenCalled();
    });
  });

  describe("toggleProfessionalActive", () => {
    it("returns error when professional belongs to another tenant", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      const result = await toggleProfessionalActive(PROF_B);

      expect(result).toEqual({
        success: false,
        error: "Profissional não encontrado.",
      });
    });

    it("scopes toggle to authenticated tenant", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await toggleProfessionalActive(PROF_B);

      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("never updates without verifying ownership first", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await toggleProfessionalActive(PROF_B);

      expect(vi.mocked(db.professional.update)).not.toHaveBeenCalled();
    });
  });

  describe("createProfessional", () => {
    it("creates professional scoped to authenticated tenant only", async () => {
      vi.mocked(db.professional.create).mockResolvedValue(makeProfessional());

      await createProfessional({ name: "New Professional" });

      expect(vi.mocked(db.professional.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("getProfessionalsData", () => {
    it("queries only professionals from the authenticated tenant", async () => {
      vi.mocked(db.professional.findMany).mockResolvedValue([]);

      await getProfessionalsData();

      expect(vi.mocked(db.professional.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });
});
