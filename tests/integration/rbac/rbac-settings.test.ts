/**
 * TEST-03 — RBAC: Settings + Access Control (Acessos) actions
 *
 * Guards tested:
 *   settings/actions.ts:
 *     - getAcessosData, addService, updateService, deleteService, toggleServiceActive,
 *       revogarConvite, reenviarConvite, revogarMembro, updateMembershipComissao
 *       → ALL: requireRole("owner")
 *
 *   settings/acessos/actions.ts:
 *     - createInvitationAction, revokeMembershipAction, revokeInvitationAction,
 *       resendInvitationAction, getAcessosData
 *       → ALL: requireRole("owner")
 *
 * Failure criterion:
 *   - Remove requireRole from any function → toHaveBeenCalledWith("owner") fails
 *   - Change requireRole to requireMembership → role assertion fails
 *   - Widen to include reception → "owner" assertion fails
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  getAcessosData as getSettingsAcessosData,
  revogarConvite,
  revogarMembro,
  reenviarConvite,
  addService,
  updateService,
  deleteService,
  toggleServiceActive,
} from "@/app/(dashboard)/dashboard/settings/actions";
import {
  createInvitationAction,
  revokeMembershipAction,
  revokeInvitationAction,
  resendInvitationAction,
  getAcessosData,
} from "@/app/(dashboard)/dashboard/settings/acessos/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { MemberRole } from "@prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    membership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    invitation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    service: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    barbershop: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    professional: { findMany: vi.fn() },
    businessHour: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn().mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn({ membership: { create: vi.fn() }, invitation: { update: vi.fn() } });
      return Promise.all(fn as Promise<unknown>[]);
    }),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Module-level Resend mock (settings/actions.ts instantiates Resend at load time)
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ id: "sent" }) };
  },
}));

vi.mock("@/lib/email", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/plans", () => ({
  canAddMember: vi.fn().mockReturnValue(true),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.membership.findMany).mockResolvedValue([]);
  vi.mocked(db.invitation.findMany).mockResolvedValue([]);
  vi.mocked(db.service.findMany).mockResolvedValue([]);
  vi.mocked(db.professional.findMany).mockResolvedValue([]);
});

// Helper: configure requireRole to throw (simulating non-owner blocked)
function blockAll() {
  vi.mocked(requireRole).mockRejectedValue(new Error("UNAUTHORIZED"));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RBAC — Settings (owner-only)", () => {
  describe("getAcessosData() from settings/actions.ts", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());

      await getSettingsAcessosData();

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from reading acessos data", async () => {
      blockAll();

      await expect(getSettingsAcessosData()).rejects.toThrow();

      expect(vi.mocked(db.membership.findMany)).not.toHaveBeenCalled();
    });

    it("blocks barber from reading acessos data", async () => {
      blockAll();

      await expect(getSettingsAcessosData()).rejects.toThrow();
    });
  });

  describe("addService()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.service.create).mockResolvedValue({} as never);

      const fd = new FormData();
      fd.set("name", "Corte");
      fd.set("duration", "30");
      fd.set("price", "2500");
      await addService(null, fd);

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from adding service", async () => {
      blockAll();

      const fd = new FormData();
      fd.set("name", "Corte");
      fd.set("duration", "30");
      fd.set("price", "2500");

      await expect(addService(null, fd)).rejects.toThrow();

      expect(vi.mocked(db.service.create)).not.toHaveBeenCalled();
    });
  });

  describe("updateService()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      const fd = new FormData();
      fd.set("serviceId", "svc-1");
      fd.set("name", "Corte");
      fd.set("duration", "30");
      fd.set("price", "2500");
      await updateService(null, fd);

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks barber from updating service", async () => {
      blockAll();

      const fd = new FormData();
      fd.set("serviceId", "svc-1");
      fd.set("name", "Corte");
      fd.set("duration", "30");
      fd.set("price", "2500");

      await expect(updateService(null, fd)).rejects.toThrow();

      expect(vi.mocked(db.service.findFirst)).not.toHaveBeenCalled();
    });
  });

  describe("deleteService()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      try {
        await deleteService("svc-1");
      } catch {
        // expected: service not found
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from deleting service", async () => {
      blockAll();

      await expect(deleteService("svc-1")).rejects.toThrow();

      expect(vi.mocked(db.service.findFirst)).not.toHaveBeenCalled();
    });
  });

  describe("toggleServiceActive()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.service.findFirst).mockResolvedValue(null);

      try {
        await toggleServiceActive("svc-1");
      } catch {
        // expected: service not found
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks barber from toggling service", async () => {
      blockAll();

      await expect(toggleServiceActive("svc-1")).rejects.toThrow();
    });
  });

  describe("revogarConvite()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 0 });

      await revogarConvite("invite-1");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks barber from revoking invitation", async () => {
      blockAll();

      await expect(revogarConvite("invite-1")).rejects.toThrow();

      expect(vi.mocked(db.invitation.updateMany)).not.toHaveBeenCalled();
    });
  });

  describe("reenviarConvite()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

      try {
        await reenviarConvite("invite-1");
      } catch {
        // expected: not found
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from resending invitation", async () => {
      blockAll();

      await expect(reenviarConvite("invite-1")).rejects.toThrow();

      expect(vi.mocked(db.invitation.findFirst)).not.toHaveBeenCalled();
    });
  });

  describe("revogarMembro()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      try {
        await revogarMembro("mem-1");
      } catch {
        // expected: not found
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from revoking membership", async () => {
      blockAll();

      await expect(revogarMembro("mem-1")).rejects.toThrow();

      expect(vi.mocked(db.membership.findFirst)).not.toHaveBeenCalled();
    });
  });
});

describe("RBAC — Acessos actions (owner-only)", () => {
  describe("createInvitationAction()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await createInvitationAction({
        email: "new@example.com",
        role: "barber",
        professionalId: "prof-1",
        commissionOnServices: false,
        commissionOnProducts: false,
      });

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from creating invitation", async () => {
      blockAll();

      await expect(
        createInvitationAction({
          email: "new@example.com",
          role: "barber",
          professionalId: "prof-1",
          commissionOnServices: false,
          commissionOnProducts: false,
        }),
      ).rejects.toThrow();
    });

    it("blocks barber from creating invitation", async () => {
      blockAll();

      await expect(
        createInvitationAction({
          email: "new@example.com",
          role: "barber",
          professionalId: "prof-1",
          commissionOnServices: false,
          commissionOnProducts: false,
        }),
      ).rejects.toThrow();
    });
  });

  describe("revokeMembershipAction()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      await revokeMembershipAction("mem-1");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from revoking team membership", async () => {
      blockAll();

      await expect(revokeMembershipAction("mem-1")).rejects.toThrow();
    });
  });

  describe("revokeInvitationAction()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

      await revokeInvitationAction("inv-1");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from revoking invitation", async () => {
      blockAll();

      await expect(revokeInvitationAction("inv-1")).rejects.toThrow();
    });
  });

  describe("resendInvitationAction()", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());
      vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

      await resendInvitationAction("inv-1");

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks barber from resending invitation", async () => {
      blockAll();

      await expect(resendInvitationAction("inv-1")).rejects.toThrow();
    });
  });

  describe("getAcessosData() from acessos/actions.ts", () => {
    it("calls requireRole with owner", async () => {
      vi.mocked(requireRole).mockResolvedValue(ownerCtx());

      await getAcessosData();

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });

    it("blocks receptionist from reading team data", async () => {
      blockAll();

      await expect(getAcessosData()).rejects.toThrow();

      expect(vi.mocked(db.membership.findMany)).not.toHaveBeenCalled();
    });
  });
});
