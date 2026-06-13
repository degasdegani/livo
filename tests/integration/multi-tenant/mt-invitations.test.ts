/**
 * TEST-02 — Multi-tenant isolation: Invitations & Access Control
 *
 * Guards tested (settings/actions.ts + convite/[token]/actions.ts):
 *   1. revogarConvite: requireRole("owner") + updateMany with barbershopId filter
 *   2. reenviarConvite: requireRole("owner") + findFirst({ id, barbershopId }) guard
 *   3. revogarMembro: requireRole("owner") + membership findFirst({ id, barbershopId })
 *   4. acceptInvitationAction: membership created with invitation.barbershopId (not user-controlled)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  revogarConvite,
  reenviarConvite,
  revogarMembro,
} from "@/app/(dashboard)/dashboard/settings/actions";
import { acceptInvitationAction } from "@/app/convite/[token]/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { InvitationStatus, MemberRole } from "@prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invitation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    barbershop: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    service: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    businessHour: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

// settings/actions.ts instantiates Resend at module load time — use class, not arrow fn
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ id: "sent" }) };
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    convite: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const SHOP_B = "shop-tenant-b";
const INVITE_B = "invite-from-shop-b";
const MEMBER_B = "member-from-shop-b";
const ownerCtx = () => makeMembershipContext({ barbershopId: SHOP_A, role: "owner" });

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
  vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return fn(db);
    return Promise.all(fn as Promise<unknown>[]);
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Invitations & Access Control", () => {
  describe("revogarConvite", () => {
    it("scopes revocation to authenticated tenant via updateMany WHERE", async () => {
      vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 0 });

      await revogarConvite(INVITE_B);

      expect(vi.mocked(db.invitation.updateMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("zero rows affected when invitation belongs to another tenant", async () => {
      vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 0 });

      await revogarConvite(INVITE_B);

      // updateMany with {id: INVITE_B, barbershopId: SHOP_A} → 0 rows if it belongs to SHOP_B
      expect(vi.mocked(db.invitation.updateMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: INVITE_B,
            barbershopId: SHOP_A,
          }),
        }),
      );
    });

    it("requires owner role before revoking any invitation", async () => {
      vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 0 });

      await revogarConvite(INVITE_B);

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });
  });

  describe("reenviarConvite", () => {
    it("throws when invitation belongs to another tenant", async () => {
      vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

      await expect(reenviarConvite(INVITE_B)).rejects.toThrow(
        "Convite não encontrado.",
      );
    });

    it("scopes invitation lookup to authenticated tenant", async () => {
      vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

      try {
        await reenviarConvite(INVITE_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.invitation.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("requires owner role before resending invitation", async () => {
      vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

      try {
        await reenviarConvite(INVITE_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });
  });

  describe("revogarMembro", () => {
    it("throws when membership belongs to another tenant", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      await expect(revogarMembro(MEMBER_B)).rejects.toThrow(
        "Membro não encontrado.",
      );
    });

    it("scopes membership lookup to authenticated tenant", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      try {
        await revogarMembro(MEMBER_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.membership.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("never deactivates membership without verifying barbershopId first", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      try {
        await revogarMembro(MEMBER_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.membership.update)).not.toHaveBeenCalled();
    });

    it("requires owner role before revoking membership", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      try {
        await revogarMembro(MEMBER_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(requireRole)).toHaveBeenCalledWith("owner");
    });
  });

  describe("acceptInvitationAction", () => {
    it("returns error for non-existent invitation token", async () => {
      vi.mocked(db.invitation.findUnique).mockResolvedValue(null);

      const result = await acceptInvitationAction({
        token: "invalid-token",
        mode: "existing",
      });

      expect(result).toEqual({
        success: false,
        error: "Convite não encontrado.",
      });
    });

    it("returns error when invitation is already accepted", async () => {
      vi.mocked(db.invitation.findUnique).mockResolvedValue({
        id: "invite-1",
        token: "valid-token",
        status: InvitationStatus.accepted,
        barbershopId: SHOP_A,
        email: "user@example.com",
        role: MemberRole.barber,
        expiresAt: new Date(Date.now() + 86400000),
        invitedById: "owner-id",
        professionalId: null,
        commissionOnServices: false,
        commissionOnProducts: false,
        acceptedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await acceptInvitationAction({
        token: "valid-token",
        mode: "existing",
      });

      expect(result).toEqual({
        success: false,
        error: "Este convite não está mais disponível.",
      });
    });

    it("creates membership with barbershopId from invitation — not from user input", async () => {
      vi.mocked(db.invitation.findUnique).mockResolvedValue({
        id: "invite-1",
        token: "valid-token",
        status: InvitationStatus.pending,
        barbershopId: SHOP_B, // The invitation is for shop B
        email: "newmember@example.com",
        role: MemberRole.barber,
        expiresAt: new Date(Date.now() + 86400000),
        invitedById: "owner-b-id",
        professionalId: null,
        commissionOnServices: false,
        commissionOnProducts: false,
        acceptedAt: null,
        createdAt: new Date(),
      });

      vi.mocked(db.user.findUnique).mockResolvedValue(null); // no existing user
      vi.mocked(db.user.create).mockResolvedValue({
        id: "new-user-id",
        name: "New Member",
        email: "newmember@example.com",
        password: "hashed",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        birthDate: null,
        cpf: null,
      });
      vi.mocked(db.membership.findFirst).mockResolvedValue(null); // not already member

      const txMock = {
        membership: { create: vi.fn().mockResolvedValue({}) },
        invitation: { update: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) => {
        if (typeof fn === "function") return fn(txMock);
        return Promise.all(fn as Promise<unknown>[]);
      });

      try {
        await acceptInvitationAction({
          token: "valid-token",
          mode: "create",
          name: "New Member",
          password: "password123",
        });
      } catch {
        // redirect() throws in Next.js server context
      }

      // Membership must be created with the barbershopId from the invitation
      expect(txMock.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            barbershopId: SHOP_B, // Matches the invitation's barbershopId
          }),
        }),
      );
    });
  });
});
