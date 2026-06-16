/**
 * TEST-06 — Comandas: Abertura
 *
 * Tests abrirComanda + getComanda from
 * src/app/(dashboard)/dashboard/comandas/actions.ts
 *
 * Failure criteria:
 * - Remove `status: ComandaStatus.open` → comanda created with wrong status
 * - Remove `totalInCents: 0` → comanda created with wrong initial total
 * - Remove barbershopId from create data → comanda not scoped to tenant
 * - Remove appointmentId duplicate check → two comandas for same appointment
 * - Remove barber restriction → barber opens comanda for any professional
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ComandaStatus, MemberRole } from "@prisma/client";
import {
  abrirComanda,
  getComanda,
} from "@/app/(dashboard)/dashboard/comandas/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    membership: { findFirst: vi.fn() },
    appointmentService: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    comanda: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-a";
const PROF_A = "prof-a";

// ── Helpers ────────────────────────────────────────────────────────────────────

function ownerCtx() {
  return makeMembershipContext({
    barbershopId: SHOP_A,
    role: MemberRole.owner,
    professionalId: null,
  });
}

function barberCtx(professionalId: string = PROF_A) {
  return makeMembershipContext({
    barbershopId: SHOP_A,
    role: MemberRole.barber,
    professionalId,
  });
}

const baseData = {
  professionalId: PROF_A,
  clientName: "João da Silva",
};

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.comanda.create).mockResolvedValue({ id: "comanda-nova" } as never);
  vi.mocked(db.comanda.findFirst).mockResolvedValue(null);
  vi.mocked(db.appointmentService.findMany).mockResolvedValue([]);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("abrirComanda()", () => {
  it("creates comanda with status open and totalInCents 0", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda(baseData);
    } catch {
      /* redirect throws NEXT_REDIRECT */
    }

    expect(vi.mocked(db.comanda.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ComandaStatus.open,
          totalInCents: 0,
        }),
      }),
    );
  });

  it("scopes new comanda to membership.barbershopId (tenant isolation)", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda(baseData);
    } catch {
      /* redirect */
    }

    expect(vi.mocked(db.comanda.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });

  it("redirects to new comanda URL after successful creation", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    await expect(abrirComanda(baseData)).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      "/dashboard/comandas/comanda-nova",
    );
  });

  it("redirects to existing comanda when appointmentId already has one (duplicate prevention)", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue(
      { id: "comanda-existente" } as never,
    );

    await expect(
      abrirComanda({ ...baseData, appointmentId: "appt-1" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      "/dashboard/comandas/comanda-existente",
    );
    expect(vi.mocked(db.comanda.create)).not.toHaveBeenCalled();
  });

  it("proceeds to create when appointmentId has no existing comanda", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

    try {
      await abrirComanda({ ...baseData, appointmentId: "appt-new" });
    } catch {
      /* redirect */
    }

    expect(vi.mocked(db.comanda.create)).toHaveBeenCalled();
  });

  it("does not query for duplicate when appointmentId is absent", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda(baseData);
    } catch {
      /* redirect */
    }

    expect(vi.mocked(db.comanda.findFirst)).not.toHaveBeenCalled();
  });

  it("blocks barber from opening comanda for a different professional", async () => {
    vi.mocked(requireMembership).mockResolvedValue(barberCtx("prof-own"));

    await expect(
      abrirComanda({ ...baseData, professionalId: "prof-other" }),
    ).rejects.toThrow("Barbeiro só pode abrir comanda para si mesmo.");

    expect(vi.mocked(db.comanda.create)).not.toHaveBeenCalled();
  });

  it("allows barber to open comanda for their own professionalId", async () => {
    vi.mocked(requireMembership).mockResolvedValue(barberCtx(PROF_A));

    try {
      await abrirComanda({ ...baseData, professionalId: PROF_A });
    } catch {
      /* redirect */
    }

    expect(vi.mocked(db.comanda.create)).toHaveBeenCalled();
  });

  it("allows owner to open comanda for any professional", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda({ ...baseData, professionalId: "prof-any" });
    } catch {
      /* redirect */
    }

    expect(vi.mocked(db.comanda.create)).toHaveBeenCalled();
  });

  it("logs comanda.info with barbershopId and comandaId on creation", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda(baseData);
    } catch {
      /* redirect */
    }

    expect(vi.mocked(log.comanda.info)).toHaveBeenCalledWith(
      expect.stringContaining("comanda"),
      expect.objectContaining({
        barbershopId: SHOP_A,
        comandaId: "comanda-nova",
      }),
    );
  });
});

describe("getComanda()", () => {
  it("queries comanda by id AND barbershopId from membership (tenant isolation)", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue(
      { id: "comanda-a" } as never,
    );

    await getComanda("comanda-a");

    expect(vi.mocked(db.comanda.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "comanda-a",
          barbershopId: SHOP_A,
        }),
      }),
    );
  });

  it("returns null when comanda not found in tenant", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

    const result = await getComanda("comanda-missing");

    expect(result).toBeNull();
  });
});
