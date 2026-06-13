/**
 * TEST-06 — Comandas: RBAC, Multi-Tenant & Observabilidade
 *
 * Tests cross-cutting concerns across all comanda actions:
 *   - RBAC: requireMembership vs requireRole(["owner"])
 *   - getComandas: barber sees only own professional's comandas
 *   - getComandas: filter modes (abertas / fechadas / hoje / todas)
 *   - getComandas: barbershopId isolation (owner sees all in their shop)
 *   - Observabilidade: log.comanda called for all mutating actions
 *
 * These tests complement the operation-specific files by verifying
 * cross-tenant data access patterns in the listing queries.
 *
 * Failure criteria:
 * - Remove professionalId filter in getComandas → barber sees other pros' comandas
 * - Remove barbershopId filter in getComandas → cross-tenant data leak
 * - Swap requireRole to requireMembership in cancelarComanda → non-owners can cancel
 * - Remove filtro logic → status/date filters have no effect
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import { ComandaStatus, MemberRole } from "@prisma/client";
import {
  getComandas,
  abrirComanda,
  addServicoItem,
  addProdutoItem,
  removeItem,
  fecharComanda,
  cancelarComanda,
} from "@/app/(dashboard)/dashboard/comandas/actions";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    comanda: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    comandaItem: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    service: { findFirst: vi.fn() },
    product: { findFirst: vi.fn() },
    membership: { findFirst: vi.fn() },
    professional: { findMany: vi.fn() },
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

function receptionCtx() {
  return makeMembershipContext({
    barbershopId: SHOP_A,
    role: MemberRole.reception,
    professionalId: null,
  });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.comanda.findMany).mockResolvedValue([]);
  vi.mocked(db.comanda.create).mockResolvedValue({ id: "comanda-nova" } as never);
  vi.mocked(db.comanda.findFirst).mockResolvedValue(null);

  // Default array-style $transaction mock
  vi.mocked(db.$transaction).mockImplementation(
    async (ops: unknown) =>
      typeof ops === "function"
        ? (ops as (t: unknown) => unknown)({
            comanda: { update: vi.fn().mockResolvedValue({}) },
            appointment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findFirst: vi.fn().mockResolvedValue(null) },
            client: { update: vi.fn().mockResolvedValue({}) },
            comandaItem: { update: vi.fn().mockResolvedValue({}) },
            product: { update: vi.fn().mockResolvedValue({}) },
            stockMovement: { create: vi.fn().mockResolvedValue({}) },
          })
        : Promise.all(ops as Promise<unknown>[]),
  );
});

// ── getComandas — RBAC ────────────────────────────────────────────────────────

describe("getComandas() — RBAC", () => {
  it("barber sees only their own professionalId's comandas", async () => {
    vi.mocked(requireMembership).mockResolvedValue(barberCtx(PROF_A));

    await getComandas("abertas");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ professionalId: PROF_A }),
      }),
    );
  });

  it("owner does NOT filter by professionalId (sees all comandas in shop)", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    await getComandas("abertas");

    const call = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    expect((call as { where: Record<string, unknown> }).where).not.toHaveProperty(
      "professionalId",
    );
  });

  it("receptionist does NOT filter by professionalId (sees all comandas)", async () => {
    vi.mocked(requireMembership).mockResolvedValue(receptionCtx());

    await getComandas("abertas");

    const call = vi.mocked(db.comanda.findMany).mock.calls[0][0];
    expect((call as { where: Record<string, unknown> }).where).not.toHaveProperty(
      "professionalId",
    );
  });
});

// ── getComandas — Multi-Tenant ────────────────────────────────────────────────

describe("getComandas() — Multi-Tenant", () => {
  it("always filters by membership.barbershopId (tenant isolation)", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    await getComandas("abertas");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: SHOP_A }),
      }),
    );
  });
});

// ── getComandas — Filtros ─────────────────────────────────────────────────────

describe("getComandas() — filtros", () => {
  beforeEach(() => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
  });

  it("filtro 'abertas' → where.status = open", async () => {
    await getComandas("abertas");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ComandaStatus.open }),
      }),
    );
  });

  it("filtro 'fechadas' → where.status = closed", async () => {
    await getComandas("fechadas");

    expect(vi.mocked(db.comanda.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ComandaStatus.closed }),
      }),
    );
  });

  it("filtro 'hoje' → where.openedAt range (gte/lt today)", async () => {
    await getComandas("hoje");

    const call = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where).toHaveProperty("openedAt");
    expect(call.where.openedAt).toMatchObject({ gte: expect.any(Date), lt: expect.any(Date) });
  });

  it("filtro 'todas' → no status or date filter applied", async () => {
    await getComandas("todas");

    const call = vi.mocked(db.comanda.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(call.where).not.toHaveProperty("status");
    expect(call.where).not.toHaveProperty("openedAt");
  });
});

// ── cancelarComanda — RBAC ────────────────────────────────────────────────────

describe("cancelarComanda() — RBAC", () => {
  it("uses requireRole not requireMembership — only owners can cancel", async () => {
    vi.mocked(requireRole).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue({
      id: "comanda-a",
      barbershopId: SHOP_A,
      status: ComandaStatus.open,
      appointmentId: null,
      items: [],
    } as never);

    try {
      await cancelarComanda("comanda-a");
    } catch {
      /* redirect */
    }

    expect(vi.mocked(requireRole)).toHaveBeenCalledWith(["owner"]);
    expect(vi.mocked(requireMembership)).not.toHaveBeenCalled();
  });

  it("receptionist rejected by requireRole before any DB access", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("Acesso negado."));

    await expect(cancelarComanda("comanda-a")).rejects.toThrow("Acesso negado.");

    expect(vi.mocked(db.comanda.findFirst)).not.toHaveBeenCalled();
  });
});

// ── abrirComanda — RBAC ───────────────────────────────────────────────────────

describe("abrirComanda() — RBAC", () => {
  it("uses requireMembership (not requireRole) — all authenticated roles can open", async () => {
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda({ professionalId: PROF_A, clientName: "Test" });
    } catch {
      /* redirect */
    }

    expect(vi.mocked(requireMembership)).toHaveBeenCalled();
    expect(vi.mocked(requireRole)).not.toHaveBeenCalled();
  });
});

// ── Observabilidade ───────────────────────────────────────────────────────────

describe("Observabilidade — log.comanda", () => {
  it("abrirComanda → logs comanda.info on creation", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());

    try {
      await abrirComanda({ professionalId: PROF_A, clientName: "Test" });
    } catch {
      /* redirect */
    }

    expect(vi.mocked(log.comanda.info)).toHaveBeenCalled();
  });

  it("fecharComanda → logs comanda.info on close", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue({
      id: "comanda-a",
      barbershopId: SHOP_A,
      status: ComandaStatus.open,
      professionalId: "prof-a",
      totalInCents: 5000,
      appointmentId: null,
      clientId: null,
      items: [],
    } as never);
    vi.mocked(db.membership.findFirst).mockResolvedValue(null);

    await expect(fecharComanda("comanda-a", "pix")).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(vi.mocked(log.comanda.info)).toHaveBeenCalledWith(
      expect.stringContaining("fechada"),
      expect.any(Object),
    );
  });

  it("cancelarComanda → logs comanda.warn on cancel", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(requireRole).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue({
      id: "comanda-a",
      barbershopId: SHOP_A,
      status: ComandaStatus.open,
      appointmentId: null,
      items: [],
    } as never);

    await expect(cancelarComanda("comanda-a")).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(log.comanda.warn)).toHaveBeenCalledWith(
      expect.stringContaining("cancelada"),
      expect.any(Object),
    );
  });

  it("addServicoItem → does NOT log (read/write item has no observability event)", async () => {
    const { log } = await import("@/lib/logger");
    vi.mocked(requireMembership).mockResolvedValue(ownerCtx());
    vi.mocked(db.comanda.findFirst).mockResolvedValue({
      id: "comanda-a",
      barbershopId: SHOP_A,
      status: ComandaStatus.open,
      totalInCents: 0,
    } as never);
    vi.mocked(db.service.findFirst).mockResolvedValue({
      id: "svc-1",
      name: "Corte",
      priceInCents: 3000,
    } as never);
    vi.mocked(db.comandaItem.create).mockResolvedValue({} as never);
    vi.mocked(db.comanda.update).mockResolvedValue({} as never);

    await addServicoItem("comanda-a", "svc-1");

    expect(vi.mocked(log.comanda.info)).not.toHaveBeenCalled();
    expect(vi.mocked(log.comanda.warn)).not.toHaveBeenCalled();
  });
});
