/**
 * TEST-07 — Convites: Aceitação
 *
 * Tests acceptInvitationAction from
 * src/app/convite/[token]/actions.ts
 *
 * Scenarios already covered by mt-invitations.test.ts (not duplicated here):
 *   - token not found → "Convite não encontrado."
 *   - status accepted → "Este convite não está mais disponível."
 *   - barbershopId taken from invitation, not user input
 *
 * Failure criteria:
 * - Remove status !== pending check → revoked/expired invitations accepted
 * - Remove expiresAt check → expired invitations accepted
 * - Remove session guard → unauthenticated users can use "existing" mode
 * - Remove email duplicate check → two accounts for same email
 * - Remove alreadyMember check → double membership created
 * - Remove bcrypt → plaintext password stored
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InvitationStatus, MemberRole } from "@prisma/client";
import { acceptInvitationAction } from "@/app/convite/[token]/actions";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invitation: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    membership: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password") },
}));

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
const TOKEN = "valid-uuid-token";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "invite-1",
    token: TOKEN,
    status: InvitationStatus.pending,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    email: "novo@example.com",
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

function makeAcceptTx(userId = "new-user-id") {
  return {
    user: { create: vi.fn().mockResolvedValue({ id: userId }) },
    membership: { create: vi.fn().mockResolvedValue({}) },
    invitation: { update: vi.fn().mockResolvedValue({}) },
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Token Status Validation ────────────────────────────────────────────────────

describe("acceptInvitationAction() — status validation", () => {
  it("returns error when invitation status is revoked", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ status: InvitationStatus.revoked }) as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Este convite não está mais disponível.",
    });
  });

  it("returns error when invitation status is expired (already set in DB)", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ status: InvitationStatus.expired }) as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Este convite não está mais disponível.",
    });
  });

  it("marks pending invitation as expired when expiresAt is in the past", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ expiresAt: new Date("2020-01-01") }) as never,
    );

    await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(vi.mocked(db.invitation.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invite-1" },
        data: { status: InvitationStatus.expired },
      }),
    );
  });

  it("returns expiry error when expiresAt is in the past", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ expiresAt: new Date("2020-01-01") }) as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({ success: false, error: "Este convite expirou." });
  });
});

// ── Mode: Existing ─────────────────────────────────────────────────────────────

describe("acceptInvitationAction() — mode: existing", () => {
  it("returns error when not logged in (no session)", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Você precisa estar logado para aceitar com uma conta existente.",
    });
  });

  it("returns error when session exists but has no user.id", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Você precisa estar logado para aceitar com uma conta existente.",
    });
  });

  it("uses session.user.id as the membership userId", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-existing" } } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-existing" }),
      }),
    );
  });
});

// ── Mode: Create ───────────────────────────────────────────────────────────────

describe("acceptInvitationAction() — mode: create", () => {
  it("returns error when invitation email is already registered", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "user-old" } as never);

    const result = await acceptInvitationAction({
      token: TOKEN,
      mode: "create",
      name: "João",
      password: "senha123",
    });

    expect(result).toEqual({
      success: false,
      error: "Este e-mail já está cadastrado. Faça login e tente aceitar novamente.",
    });
  });

  it("creates new user with bcrypt-hashed password", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "create", name: "João", password: "senha123" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    const bcrypt = await import("bcryptjs");
    expect(vi.mocked(bcrypt.default.hash)).toHaveBeenCalledWith("senha123", 10);
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "João",
          password: "hashed-password",
        }),
      }),
    );
  });

  it("creates user with invitation.email (not caller-supplied email)", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ email: "invitation@example.com" }) as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "create", name: "João", password: "senha" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "invitation@example.com" }),
      }),
    );
  });

  it("uses new user id as membership userId", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const tx = makeAcceptTx("created-user-id");
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "create", name: "João", password: "senha" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "created-user-id" }),
      }),
    );
  });
});

// ── Already Member Guard ───────────────────────────────────────────────────────

describe("acceptInvitationAction() — already member guard", () => {
  it("returns error when user is already an active member of the barbershop", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-a" } } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: "existing-mem" } as never,
    );

    const result = await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(result).toEqual({
      success: false,
      error: "Você já é membro desta barbearia.",
    });
  });

  it("checks membership with userId + barbershopId + isActive from invitation", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ barbershopId: SHOP_A }) as never,
    );
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-a" } } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(
      { id: "existing-mem" } as never,
    );

    await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(vi.mocked(db.membership.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-a",
          barbershopId: SHOP_A,
          isActive: true,
        }),
      }),
    );
  });
});

// ── Membership Creation ────────────────────────────────────────────────────────

describe("acceptInvitationAction() — membership creation", () => {
  function setupSuccess(invitationOverrides: Record<string, unknown> = {}) {
    const invitation = makePendingInvitation(invitationOverrides);
    vi.mocked(db.invitation.findUnique).mockResolvedValue(invitation as never);
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-a" } } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);
    return invitation;
  }

  it("creates membership with role from invitation", async () => {
    setupSuccess({ role: MemberRole.reception });
    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: MemberRole.reception }),
      }),
    );
  });

  it("creates membership with professionalId from invitation", async () => {
    setupSuccess({ professionalId: "prof-xyz" });
    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ professionalId: "prof-xyz" }),
      }),
    );
  });

  it("creates membership with isActive=true (commission lives on Professional, not copied from invitation)", async () => {
    setupSuccess();
    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it("marks invitation as accepted with acceptedAt in the same transaction", async () => {
    setupSuccess();
    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(tx.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invite-1" },
        data: expect.objectContaining({
          status: InvitationStatus.accepted,
          acceptedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("redirects to /dashboard on successful acceptance", async () => {
    setupSuccess();
    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });
});

// ── Observabilidade ────────────────────────────────────────────────────────────

describe("acceptInvitationAction() — observabilidade", () => {
  it("logs convite.warn when invitation status is not pending (indisponível)", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ status: InvitationStatus.revoked }) as never,
    );

    await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(vi.mocked(log.convite.warn)).toHaveBeenCalledWith(
      expect.stringContaining("indisponível"),
      expect.any(Object),
    );
  });

  it("logs convite.warn when invitation is past expiresAt", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ expiresAt: new Date("2020-01-01") }) as never,
    );

    await acceptInvitationAction({ token: TOKEN, mode: "existing" });

    expect(vi.mocked(log.convite.warn)).toHaveBeenCalledWith(
      expect.stringContaining("expirado"),
      expect.any(Object),
    );
  });

  it("logs convite.info with userId and barbershopId on successful acceptance (existing)", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation({ barbershopId: SHOP_A }) as never,
    );
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-a" } } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    const tx = makeAcceptTx();
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "existing" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.convite.info)).toHaveBeenCalledWith(
      expect.stringContaining("aceito"),
      expect.objectContaining({
        userId: "user-a",
        barbershopId: SHOP_A,
        mode: "existing",
      }),
    );
  });

  it("logs convite.info with userId when new user is created (mode: create)", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(db.invitation.findUnique).mockResolvedValue(
      makePendingInvitation() as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const tx = makeAcceptTx("new-user-id");
    vi.mocked(db.$transaction).mockImplementation(async (fn: unknown) =>
      (fn as (t: typeof tx) => unknown)(tx),
    );

    await expect(
      acceptInvitationAction({ token: TOKEN, mode: "create", name: "João", password: "senha" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.convite.info)).toHaveBeenCalledWith(
      expect.stringContaining("usuário criado"),
      expect.objectContaining({ userId: "new-user-id" }),
    );
  });
});
