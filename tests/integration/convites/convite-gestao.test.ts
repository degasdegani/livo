/**
 * TEST-07 — Convites: Gestão
 *
 * Tests management operations from both action files:
 *   acessos/actions.ts: revokeInvitationAction, revokeMembershipAction, resendInvitationAction
 *   settings/actions.ts: revogarConvite, reenviarConvite, revogarMembro, updateMembershipComissao
 *
 * Failure criteria:
 * - Remove status check in revokeInvitationAction → accepted invites can be revoked
 * - Remove owner guard in revokeMembershipAction → non-owner memberships can be removed
 * - Remove expiresAt refresh in resend/reenviar → old token stays valid
 * - Remove token rotation in resend/reenviar → same token reused (security issue)
 * - Remove owner guard in updateMembershipComissao → owner commission modified
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { sendInvitationEmail } from "@/lib/email";
import { InvitationStatus, MemberRole } from "@prisma/client";
import {
  revokeInvitationAction,
  revokeMembershipAction,
  resendInvitationAction,
} from "@/app/(dashboard)/dashboard/settings/acessos/actions";
import {
  revogarConvite,
  reenviarConvite,
  revogarMembro,
  updateMembershipComissao,
} from "@/app/(dashboard)/dashboard/settings/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invitation: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    barbershop: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

// settings/actions.ts instantiates Resend at module load — share one mock across instances
const mockResendSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "sent" }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockResendSend };
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const INVITE_ID = "invite-1";
const MEMBER_ID = "member-1";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx() {
  return makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
}

function mockPendingInvitation(overrides: Record<string, unknown> = {}) {
  vi.mocked(db.invitation.findFirst).mockResolvedValue({
    id: INVITE_ID,
    email: "membro@example.com",
    barbershopId: SHOP_A,
    status: InvitationStatus.pending,
    role: MemberRole.barber,
    token: "old-token-uuid",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  } as never);
}

function mockBarbershop() {
  vi.mocked(db.barbershop.findUnique).mockResolvedValue({
    id: SHOP_A,
    name: "Barbearia Test",
    owner: { name: "Dono" },
  } as never);
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
  vi.mocked(db.invitation.update).mockResolvedValue({} as never);
  vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(db.membership.update).mockResolvedValue({} as never);
  mockBarbershop();
});

// ── revokeInvitationAction (acessos) ──────────────────────────────────────────

describe("revokeInvitationAction() — acessos", () => {
  it("returns error when invitation not found in tenant", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    const result = await revokeInvitationAction(INVITE_ID);

    expect(result).toEqual({ success: false, error: "Convite não encontrado." });
  });

  it("returns error when invitation is not pending", async () => {
    mockPendingInvitation({ status: InvitationStatus.accepted });

    const result = await revokeInvitationAction(INVITE_ID);

    expect(result).toEqual({
      success: false,
      error: "Este convite não está mais pendente.",
    });
  });

  it("sets invitation status to revoked on success", async () => {
    mockPendingInvitation();

    const result = await revokeInvitationAction(INVITE_ID);

    expect(result).toEqual({ success: true, message: expect.any(String) });
    expect(vi.mocked(db.invitation.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: INVITE_ID },
        data: { status: InvitationStatus.revoked },
      }),
    );
  });

  it("queries invitation by id AND barbershopId (tenant isolation)", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    await revokeInvitationAction(INVITE_ID);

    expect(vi.mocked(db.invitation.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: INVITE_ID,
          barbershopId: SHOP_A,
        }),
      }),
    );
  });
});

// ── revokeMembershipAction (acessos) ──────────────────────────────────────────

describe("revokeMembershipAction() — acessos", () => {
  it("returns error when membership not found in tenant", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    const result = await revokeMembershipAction(MEMBER_ID);

    expect(result).toEqual({ success: false, error: "Membro não encontrado." });
  });

  it("returns error when target is the owner", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: MEMBER_ID, role: MemberRole.owner } as never,
    );

    const result = await revokeMembershipAction(MEMBER_ID);

    expect(result).toEqual({
      success: false,
      error: "Não é possível revogar o acesso do dono.",
    });
  });

  it("sets isActive to false on success", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: MEMBER_ID, role: MemberRole.barber } as never,
    );

    const result = await revokeMembershipAction(MEMBER_ID);

    expect(result).toEqual({ success: true, message: expect.any(String) });
    expect(vi.mocked(db.membership.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBER_ID },
        data: { isActive: false },
      }),
    );
  });

  it("queries membership by id AND barbershopId (tenant isolation)", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    await revokeMembershipAction(MEMBER_ID);

    expect(vi.mocked(db.membership.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: MEMBER_ID,
          barbershopId: SHOP_A,
        }),
      }),
    );
  });
});

// ── resendInvitationAction (acessos) ──────────────────────────────────────────

describe("resendInvitationAction() — acessos", () => {
  it("returns error when invitation not found in tenant", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    const result = await resendInvitationAction(INVITE_ID);

    expect(result).toEqual({ success: false, error: "Convite não encontrado." });
  });

  it("returns error when barbershop not found", async () => {
    mockPendingInvitation();
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    const result = await resendInvitationAction(INVITE_ID);

    expect(result).toEqual({ success: false, error: "Barbearia não encontrada." });
  });

  it("generates a NEW token (rotation) when resending", async () => {
    const OLD_TOKEN = "old-token-uuid";
    mockPendingInvitation({ token: OLD_TOKEN });

    await resendInvitationAction(INVITE_ID);

    const newToken = (
      vi.mocked(db.invitation.update).mock.calls[0][0] as { data: { token: string } }
    ).data.token;

    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(OLD_TOKEN); // token MUST change
  });

  it("refreshes expiresAt to approximately 7 days from now", async () => {
    mockPendingInvitation();

    const before = Date.now();
    await resendInvitationAction(INVITE_ID);
    const after = Date.now();

    const newExpiresAt = (
      vi.mocked(db.invitation.update).mock.calls[0][0] as { data: { expiresAt: Date } }
    ).data.expiresAt.getTime();

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(newExpiresAt).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(newExpiresAt).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  it("resets status to pending on resend", async () => {
    mockPendingInvitation({ status: InvitationStatus.expired });

    await resendInvitationAction(INVITE_ID);

    expect(vi.mocked(db.invitation.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvitationStatus.pending }),
      }),
    );
  });

  it("sends email with new token and correct recipient", async () => {
    mockPendingInvitation({ email: "membro@example.com" });

    await resendInvitationAction(INVITE_ID);

    const newToken = (
      vi.mocked(db.invitation.update).mock.calls[0][0] as { data: { token: string } }
    ).data.token;

    expect(vi.mocked(sendInvitationEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "membro@example.com",
        token: newToken,
      }),
    );
  });

  it("returns success on resend", async () => {
    mockPendingInvitation();

    const result = await resendInvitationAction(INVITE_ID);

    expect(result).toEqual({ success: true, message: expect.any(String) });
  });
});

// ── revogarConvite (settings) ─────────────────────────────────────────────────

describe("revogarConvite() — settings", () => {
  it("updates invitation status to revoked via updateMany with id + barbershopId", async () => {
    await revogarConvite(INVITE_ID);

    expect(vi.mocked(db.invitation.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: INVITE_ID,
          barbershopId: SHOP_A,
        }),
        data: { status: "revoked" },
      }),
    );
  });
});

// ── reenviarConvite (settings) ────────────────────────────────────────────────

describe("reenviarConvite() — settings", () => {
  it("throws when invitation not found in tenant", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    await expect(reenviarConvite(INVITE_ID)).rejects.toThrow(
      "Convite não encontrado.",
    );
  });

  it("generates a new token (rotation) when resending", async () => {
    const OLD_TOKEN = "old-token";
    mockPendingInvitation({ token: OLD_TOKEN });

    await reenviarConvite(INVITE_ID);

    const newToken = (
      vi.mocked(db.invitation.update).mock.calls[0][0] as { data: { token: string } }
    ).data.token;

    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(OLD_TOKEN);
  });

  it("refreshes expiresAt to ~7 days from now", async () => {
    mockPendingInvitation();

    const before = Date.now();
    await reenviarConvite(INVITE_ID);
    const after = Date.now();

    const newExpiresAt = (
      vi.mocked(db.invitation.update).mock.calls[0][0] as { data: { expiresAt: Date } }
    ).data.expiresAt.getTime();

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(newExpiresAt).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(newExpiresAt).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  it("sends email via Resend to invitation email address", async () => {
    mockPendingInvitation({ email: "membro@example.com" });

    await reenviarConvite(INVITE_ID);

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "membro@example.com" }),
    );
  });
});

// ── revogarMembro (settings) ──────────────────────────────────────────────────

describe("revogarMembro() — settings", () => {
  it("throws when membership not found in tenant", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    await expect(revogarMembro(MEMBER_ID)).rejects.toThrow("Membro não encontrado.");
  });

  it("throws when target is the owner (cannot remove owner)", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: MEMBER_ID, role: MemberRole.owner } as never,
    );

    await expect(revogarMembro(MEMBER_ID)).rejects.toThrow(
      "Não é possível remover o dono.",
    );
  });

  it("sets isActive to false for non-owner members", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: MEMBER_ID, role: MemberRole.barber } as never,
    );

    await revogarMembro(MEMBER_ID);

    expect(vi.mocked(db.membership.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBER_ID },
        data: { isActive: false },
      }),
    );
  });
});

// ── updateMembershipComissao (settings) ───────────────────────────────────────

describe("updateMembershipComissao() — settings", () => {
  const comissaoData = {
    membershipId: MEMBER_ID,
    commissionOnServices: true,
    commissionOnProducts: false,
    commissionServicePct: 20,
    commissionProductPct: null,
  };

  it("throws when membership not found in tenant", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    await expect(updateMembershipComissao(comissaoData)).rejects.toThrow(
      "Membro não encontrado.",
    );
  });

  it("throws when target is the owner (owner has no configurable commission)", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: MEMBER_ID, role: MemberRole.owner } as never,
    );

    await expect(updateMembershipComissao(comissaoData)).rejects.toThrow(
      "Owner não tem comissão configurável.",
    );
  });

  it("updates all commission fields correctly", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: MEMBER_ID, role: MemberRole.barber } as never,
    );

    await updateMembershipComissao(comissaoData);

    expect(vi.mocked(db.membership.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBER_ID },
        data: expect.objectContaining({
          commissionOnServices: true,
          commissionOnProducts: false,
          commissionServicePct: 20,
          commissionProductPct: null,
        }),
      }),
    );
  });

  it("queries membership by id AND barbershopId (tenant isolation)", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    try {
      await updateMembershipComissao(comissaoData);
    } catch {
      /* expected */
    }

    expect(vi.mocked(db.membership.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: MEMBER_ID,
          barbershopId: SHOP_A,
        }),
      }),
    );
  });
});
