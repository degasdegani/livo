/**
 * TEST-02 — Multi-tenant isolation: Services
 *
 * Guards tested (settings/actions.ts):
 *   1. updateService: requireRole("owner") + service findFirst({ barbershopId })
 *   2. deleteService: same double guard
 *   3. toggleServiceActive: same double guard
 *   4. addService: new service is always created with membership.barbershopId
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  updateService,
  deleteService,
  toggleServiceActive,
  addService,
} from "@/app/(dashboard)/dashboard/settings/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { makeService } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    service: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    barbershop: { update: vi.fn() },
    user: { update: vi.fn() },
    businessHour: { findMany: vi.fn(), update: vi.fn() },
    membership: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Module-level Resend mock — arrow functions cannot be constructors; use class
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ id: "sent" }) };
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const SVC_B = "svc-from-shop-b";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: "owner" });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
});

// Builds a FormData with required service fields
function makeServiceFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("serviceId", overrides.serviceId ?? "svc-a");
  fd.set("name", overrides.name ?? "Corte");
  fd.set("duration", overrides.duration ?? "30");
  fd.set("price", overrides.price ?? "2500");
  return fd;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Services", () => {
  describe("updateService", () => {
    it("returns error when service belongs to another tenant", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      const fd = makeServiceFormData({ serviceId: SVC_B });
      const result = await updateService(null, fd);

      expect(result).toEqual({ error: "Serviço não encontrado." });
    });

    it("scopes service lookup to authenticated owner's tenant", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      await updateService(null, makeServiceFormData({ serviceId: SVC_B }));

      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("requires owner role before touching any service", async () => {
      await updateService(null, makeServiceFormData());
      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });
  });

  describe("deleteService", () => {
    it("throws when service belongs to another tenant", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      await expect(deleteService(SVC_B)).rejects.toThrow("Serviço não encontrado.");
    });

    it("scopes service lookup to authenticated owner's tenant", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      try {
        await deleteService(SVC_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("never deletes without verifying barbershopId first", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      try {
        await deleteService(SVC_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.service.delete)).not.toHaveBeenCalled();
    });
  });

  describe("toggleServiceActive", () => {
    it("throws when service belongs to another tenant", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      await expect(toggleServiceActive(SVC_B)).rejects.toThrow(
        "Serviço não encontrado.",
      );
    });

    it("scopes toggle to authenticated tenant", async () => {
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      try {
        await toggleServiceActive(SVC_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.service.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("addService", () => {
    it("creates service scoped to authenticated owner's tenant only", async () => {
      vi.mocked(db.service.create).mockResolvedValue(makeService());

      const fd = new FormData();
      fd.set("name", "Barba");
      fd.set("duration", "30");
      fd.set("price", "2000");
      await addService(null, fd);

      expect(vi.mocked(db.service.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });
});
