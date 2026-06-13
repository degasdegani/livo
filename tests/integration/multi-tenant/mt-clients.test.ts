/**
 * TEST-02 — Multi-tenant isolation: Clients
 *
 * Guards tested:
 *   1. requireMembership() binds the session to a barbershopId
 *   2. clientScope(membership) expands to { barbershopId } in every WHERE
 *   3. findFirst with scoped WHERE returns null for cross-tenant IDs
 *   4. Every write requires the client to be found first (fail fast)
 *
 * Failure criterion: if someone removes the barbershopId filter from any
 * client query, the toHaveBeenCalledWith assertion will catch it immediately.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { requireMembership, clientScope } from "@/lib/permissions";
import {
  toggleClientBlock,
  updateClientNotes,
  updateClient,
  getClientsData,
  createClient,
} from "@/app/(dashboard)/dashboard/clients/actions";
import { makeMembershipContext } from "../../helpers/membership";
import { makeClient } from "../../factories";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    client: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireMembership: vi.fn(),
  clientScope: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-tenant-a";
const SHOP_B = "shop-tenant-b";
const CLIENT_B = "client-from-shop-b";

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireMembership).mockResolvedValue(
    makeMembershipContext({ barbershopId: SHOP_A }),
  );
  vi.mocked(clientScope).mockReturnValue({ barbershopId: SHOP_A });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("MT — Clients", () => {
  describe("toggleClientBlock", () => {
    it("throws when client belongs to another tenant", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      await expect(toggleClientBlock(CLIENT_B)).rejects.toThrow(
        "Cliente não encontrado.",
      );
    });

    it("scopes the lookup to the authenticated tenant", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      try {
        await toggleClientBlock(CLIENT_B);
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.client.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("succeeds only when client belongs to authenticated tenant", async () => {
      const clientA = makeClient({ id: "client-a", barbershopId: SHOP_A, bloqueado: false });
      vi.mocked(db.client.findFirst).mockResolvedValue(clientA);
      vi.mocked(db.client.update).mockResolvedValue({ ...clientA, bloqueado: true });

      // Should NOT throw
      await toggleClientBlock("client-a");

      expect(vi.mocked(db.client.update)).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "client-a" } }),
      );
    });
  });

  describe("updateClientNotes", () => {
    it("throws when client belongs to another tenant", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      await expect(updateClientNotes(CLIENT_B, "note")).rejects.toThrow(
        "Cliente não encontrado.",
      );
    });

    it("scopes the lookup to the authenticated tenant", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      try {
        await updateClientNotes(CLIENT_B, "note");
      } catch {
        // Expected throw
      }

      expect(vi.mocked(db.client.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("updateClient", () => {
    it("returns error when client belongs to another tenant", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      const result = await updateClient(CLIENT_B, {
        name: "Hacker",
        phone: "11999999999",
      });

      expect(result).toEqual({
        success: false,
        error: "Cliente não encontrado.",
      });
    });

    it("scopes the lookup to the authenticated tenant", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      await updateClient(CLIENT_B, { name: "Hacker", phone: "11999999999" });

      expect(vi.mocked(db.client.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("client from Tenant A cannot be edited with Tenant B barbershopId scope", async () => {
      // Lookup scoped to SHOP_A returns null for a client that belongs to SHOP_B
      vi.mocked(db.client.findFirst).mockResolvedValue(null);

      const result = await updateClient(CLIENT_B, { name: "X", phone: "11999999999" });
      // With correct scope, findFirst returns null → error returned, no update
      expect(result.success).toBe(false);
      expect(vi.mocked(db.client.update)).not.toHaveBeenCalled();
    });
  });

  describe("getClientsData", () => {
    it("queries only clients from the authenticated tenant", async () => {
      vi.mocked(db.client.findMany).mockResolvedValue([]);

      await getClientsData();

      expect(vi.mocked(db.client.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("createClient", () => {
    it("creates client scoped to authenticated tenant only", async () => {
      vi.mocked(db.client.findFirst).mockResolvedValue(null); // no duplicate
      vi.mocked(db.client.create).mockResolvedValue(makeClient());

      await createClient({ name: "New Client", phone: "11999999999" });

      expect(vi.mocked(db.client.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });
});
