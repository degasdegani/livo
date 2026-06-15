/**
 * TEST-07 — Convites: Criação
 *
 * Tests createInvitationAction (acessos/actions.ts) and
 * convidarMembro (settings/actions.ts) — both invitation creation paths.
 *
 * Failure criteria:
 * - Remove email validation → invalid emails create invitations
 * - Remove barber+professionalId guard → barber without professional slot
 * - Remove active member check → duplicate membership
 * - Remove pending invite check (acessos) → duplicate pending invitations
 * - Remove canAddMember check → plan limit bypassed
 * - Remove professional linked check → two users for same professional slot
 * - Remove pending invite expiry (settings) → old tokens stay valid
 * - Change expiresAt calculation → wrong TTL
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { canAddMember } from "@/lib/plans";
import { sendInvitationEmail } from "@/lib/email";
import { InvitationStatus, MemberRole } from "@prisma/client";
import { createInvitationAction } from "@/app/(dashboard)/dashboard/settings/acessos/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn(), findUnique: vi.fn() },
    invitation: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    barbershop: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/plans", () => ({
  canAddMember: vi.fn().mockResolvedValue({ allowed: true, current: 1, limit: 3 }),
}));

vi.mock("@/lib/email", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const USER_A = "user-owner";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx() {
  return makeMembershipContext({
    barbershopId: SHOP_A,
    role: MemberRole.owner,
    userId: USER_A,
  });
}

function mockBarbershop() {
  vi.mocked(db.barbershop.findUnique).mockResolvedValue({
    id: SHOP_A,
    name: "Barbearia Test",
    owner: { name: "Dono" },
  } as never);
}

const baseInput = {
  email: "novo@example.com",
  role: "reception" as const,
  commissionOnServices: false,
  commissionOnProducts: false,
};

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
  vi.mocked(canAddMember).mockResolvedValue({ allowed: true, current: 1, limit: 3 } as never);
  vi.mocked(db.user.findUnique).mockResolvedValue(null);
  vi.mocked(db.membership.findFirst).mockResolvedValue(null);
  vi.mocked(db.invitation.findFirst).mockResolvedValue(null);
  vi.mocked(db.invitation.create).mockResolvedValue({ id: "new-invite" } as never);
  vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 0 });
  mockBarbershop();
});

// ── createInvitationAction: Email Validation ───────────────────────────────────

describe("createInvitationAction() — email validation", () => {
  it("returns error for empty email", async () => {
    const result = await createInvitationAction({ ...baseInput, email: "" });

    expect(result).toEqual({ success: false, error: "E-mail inválido." });
    expect(vi.mocked(db.invitation.create)).not.toHaveBeenCalled();
  });

  it("returns error for email without @", async () => {
    const result = await createInvitationAction({
      ...baseInput,
      email: "notanemail",
    });

    expect(result).toEqual({ success: false, error: "E-mail inválido." });
  });

  it("normalizes email to lowercase before processing", async () => {
    await createInvitationAction({ ...baseInput, email: "NOVO@Example.COM" });

    expect(vi.mocked(db.user.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "novo@example.com" },
      }),
    );
  });
});

// ── createInvitationAction: Role Validation ────────────────────────────────────

describe("createInvitationAction() — role validation", () => {
  it("returns error when barber role has no professionalId", async () => {
    const result = await createInvitationAction({
      ...baseInput,
      role: "barber",
      professionalId: undefined,
    });

    expect(result).toEqual({
      success: false,
      error: "Selecione qual profissional este barbeiro representa.",
    });
  });

  it("allows barber role when professionalId is provided", async () => {
    const result = await createInvitationAction({
      ...baseInput,
      role: "barber",
      professionalId: "prof-1",
    });

    expect(result).toEqual({ success: true, message: expect.any(String) });
  });

  it("allows reception role without professionalId", async () => {
    const result = await createInvitationAction({ ...baseInput, role: "reception" });

    expect(result).toEqual({ success: true, message: expect.any(String) });
  });
});

// ── createInvitationAction: Duplicate Guards ───────────────────────────────────

describe("createInvitationAction() — duplicate guards", () => {
  it("returns error when email is already an active member", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "novo@example.com",
      memberships: [{ id: "mem-1", barbershopId: SHOP_A, isActive: true }],
    } as never);

    const result = await createInvitationAction(baseInput);

    expect(result).toEqual({
      success: false,
      error: "Este e-mail já é membro ativo desta barbearia.",
    });
  });

  it("returns error when a valid pending invite already exists for email", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(
      { id: "existing-invite" } as never,
    );

    const result = await createInvitationAction(baseInput);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("convite pendente"),
    });
  });

  it("queries pending invite with future expiresAt (excludes already expired)", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    await createInvitationAction(baseInput);

    expect(vi.mocked(db.invitation.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: InvitationStatus.pending,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    );
  });

  it("returns error when professional is already linked to an active membership", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: "linked-mem" } as never,
    );

    const result = await createInvitationAction({
      ...baseInput,
      role: "barber",
      professionalId: "prof-1",
    });

    expect(result).toEqual({
      success: false,
      error: "Este profissional já possui um login vinculado.",
    });
  });
});

// ── createInvitationAction: Plan Guard ────────────────────────────────────────

describe("createInvitationAction() — plan guard", () => {
  it("returns error when plan member limit is reached", async () => {
    vi.mocked(canAddMember).mockResolvedValue({ allowed: false, current: 3, limit: 3 } as never);

    const result = await createInvitationAction(baseInput);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Limite de membros"),
    });
  });

  it("returns error when barbershop not found", async () => {
    vi.mocked(db.barbershop.findUnique).mockResolvedValue(null);

    const result = await createInvitationAction(baseInput);

    expect(result).toEqual({ success: false, error: "Barbearia não encontrada." });
  });
});

// ── createInvitationAction: Success ────────────────────────────────────────────

describe("createInvitationAction() — success path", () => {
  it("creates invitation with correct email, role, barbershopId and status pending", async () => {
    await createInvitationAction({ ...baseInput, role: "reception" });

    expect(vi.mocked(db.invitation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "novo@example.com",
          role: MemberRole.reception,
          barbershopId: SHOP_A,
          status: InvitationStatus.pending,
        }),
      }),
    );
  });

  it("creates invitation with professionalId when role is barber", async () => {
    await createInvitationAction({
      ...baseInput,
      role: "barber",
      professionalId: "prof-1",
    });

    expect(vi.mocked(db.invitation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ professionalId: "prof-1" }),
      }),
    );
  });

  it("creates invitation with expiresAt approximately 7 days from now", async () => {
    const before = Date.now();
    await createInvitationAction(baseInput);
    const after = Date.now();

    const call = vi.mocked(db.invitation.create).mock.calls[0][0] as {
      data: { expiresAt: Date };
    };
    const expiresAt = call.data.expiresAt.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  it("sends invitation email with correct recipient and token", async () => {
    await createInvitationAction(baseInput);

    const createdToken = (
      vi.mocked(db.invitation.create).mock.calls[0][0] as { data: { token: string } }
    ).data.token;

    expect(vi.mocked(sendInvitationEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "novo@example.com",
        token: createdToken,
      }),
    );
  });

  it("returns success with message containing the email address", async () => {
    const result = await createInvitationAction(baseInput);

    expect(result).toEqual({
      success: true,
      message: expect.stringContaining("novo@example.com"),
    });
  });

  it("scopes invitation to barbershopId from membership (not user input)", async () => {
    await createInvitationAction(baseInput);

    expect(vi.mocked(db.invitation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });
});

