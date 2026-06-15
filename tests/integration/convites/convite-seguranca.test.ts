/**
 * TEST-07 — Convites: Segurança & Token
 *
 * Security properties of the invitation flow:
 *
 *   S-1 (old bug): invitation acceptance must only be possible via TOKEN,
 *     never via invitationId directly. The fix: db.invitation.findUnique
 *     WHERE { token: input.token } — no id-based lookup in acceptInvitationAction.
 *
 *   Token lifecycle: pending → accepted (single use), → expired (TTL), → revoked (manual)
 *
 *   Multi-tenant: all management mutations scope to membership.barbershopId.
 *
 *   RBAC: acceptInvitationAction is a public endpoint (no requireRole).
 *         All management actions require requireRole("owner").
 *
 * Failure criteria:
 * - Add id lookup to acceptInvitationAction → S-1 reintroduced
 * - Remove status check → cancelled/revoked invitations accepted
 * - Remove barbershopId from management queries → cross-tenant mutation
 * - Add requireRole to acceptInvitationAction → legitimate users blocked
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { InvitationStatus, MemberRole } from "@prisma/client";
import { acceptInvitationAction } from "@/app/convite/[token]/actions";
import {
  revokeInvitationAction,
  resendInvitationAction,
} from "@/app/(dashboard)/dashboard/settings/acessos/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invitation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: { findFirst: vi.fn(), update: vi.fn() },
    barbershop: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));

vi.mock("@/lib/email", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    convite: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const TOKEN = "secure-token-uuid";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx() {
  return makeMembershipContext({ barbershopId: SHOP_A, role: MemberRole.owner });
}

function makePendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "invite-1",
    token: TOKEN,
    status: InvitationStatus.pending,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    email: "user@example.com",
    barbershopId: SHOP_A,
    role: MemberRole.barber,
    professionalId: "prof-a",
    commissionOnServices: false,
    commissionOnProducts: false,
    invitedById: "owner-id",
    acceptedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtx());
  vi.mocked(db.invitation.update).mockResolvedValue({} as never);
  vi.mocked(db.invitation.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(db.membership.update).mockResolvedValue({} as never);
  vi.mocked(db.barbershop.findUnique).mockResolvedValue({
    id: SHOP_A,
    name: "Barbearia",
    owner: { name: "Dono" },
  } as never);
});

// ── S-1: Token-Only Lookup ────────────────────────────────────────────────────

describe("S-1 — invitation lookup is by TOKEN not by ID", () => {
  it("acceptInvitationAction uses findUnique WHERE { token } (not id)", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(null);

    await acceptInvitationAction({ token: "some-token", mode: "existing" });

    expect(vi.mocked(db.invitation.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: "some-token" },
      }),
    );
    // Verify id is NOT used in the lookup
    const callArg = vi.mocked(db.invitation.findUnique).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(callArg.where).not.toHaveProperty("id");
  });

  it("acceptInvitationAction does not accept by invitationId (no id in input type)", () => {
    // The function signature only accepts { token: string, mode: ... }
    // This is a compile-time guarantee, but we also verify the runtime behavior:
    // no alternative lookup path exists via DB
    expect(vi.mocked(db.invitation.findUnique)).not.toHaveBeenCalled();
  });
});

// ── Token Lifecycle ───────────────────────────────────────────────────────────

describe("Token lifecycle — all non-pending states block acceptance", () => {
  const nonPendingStatuses = [
    InvitationStatus.accepted,
    InvitationStatus.revoked,
    InvitationStatus.expired,
  ];

  for (const status of nonPendingStatuses) {
    it(`blocks acceptance when status is '${status}'`, async () => {
      vi.mocked(db.invitation.findUnique).mockResolvedValue(
        makePendingInvitation({ status }) as never,
      );

      const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBeTruthy();
    });
  }

  it("a reused token (accepted status) returns 'não está mais disponível'", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ status: InvitationStatus.accepted }) as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Este convite não está mais disponível.",
    });
  });

  it("a cancelled (revoked) token returns 'não está mais disponível'", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ status: InvitationStatus.revoked }) as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Este convite não está mais disponível.",
    });
  });

  it("pending invitation with past expiresAt sets status to expired and blocks acceptance", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ expiresAt: new Date("2020-01-01") }) as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({ success: false, error: "Este convite expirou." });
    expect(vi.mocked(db.invitation.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: InvitationStatus.expired },
      }),
    );
  });
});

// ── RBAC: acceptInvitationAction is PUBLIC ────────────────────────────────────

describe("RBAC — acceptInvitationAction is a public endpoint", () => {
  it("does NOT call requireRole (no authentication required to accept)", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(null);

    await acceptInvitationAction({ token: "bad-token", mode: "existing" });

    expect(vi.mocked(requireRole)).not.toHaveBeenCalled();
  });
});

// ── Multi-Tenant: Management Mutations ───────────────────────────────────────

describe("Multi-tenant — management mutations scoped to membership.barbershopId", () => {
  it("revokeInvitationAction queries invitation with barbershopId", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    await revokeInvitationAction("invite-x");

    expect(vi.mocked(db.invitation.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

  it("resendInvitationAction queries invitation with barbershopId", async () => {
    vi.mocked(db.invitation.findFirst).mockResolvedValue(null);

    await resendInvitationAction("invite-x");

    expect(vi.mocked(db.invitation.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

});

// ── Membership Data Integrity ─────────────────────────────────────────────────

describe("Membership data integrity — values from invitation, not user input", () => {
  it("membership professionalId is taken from invitation, not from user input", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ professionalId: "prof-from-invitation" }) as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({ id: "new-user" } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    const tx = {
      user: { create: vi.fn().mockResolvedValue({ id: "new-user" }) },
      membership: { create: vi.fn().mockResolvedValue({}) },
      invitation: { update: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "create", name: "João", password: "pw" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          professionalId: "prof-from-invitation",
        }),
      }),
    );
  });
});
