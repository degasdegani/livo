/**
 * Avatar upload: cross-tenant guard + file validation
 *
 * Guards tested (profissionais/actions.ts):
 *   uploadProfessionalAvatar:
 *     1. Cross-tenant: professional.findFirst scoped to membership.barbershopId
 *     2. File type: only image/jpeg, image/png, image/webp allowed (server-side)
 *     3. File size: max 5 MB enforced on the server
 *     4. Blob lifecycle: old blob deleted before new upload; new URL returned
 *
 *   removeProfessionalAvatar:
 *     1. Cross-tenant: same barbershopId guard
 *     2. Blob deleted when avatarUrl exists; skipped when null
 *     3. DB updated to avatarUrl: null
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import {
  removeProfessionalAvatar,
  uploadProfessionalAvatar,
} from "@/app/(dashboard)/dashboard/profissionais/actions";
import { makeProfessional } from "../../factories";
import { makeMembershipContext } from "../../helpers/membership";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    professional: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ── Constants ──────────────────────────────────────────────────────────────────

const SHOP_A = "shop-avatar-a";
const SHOP_B = "shop-avatar-b";
const PROF_A = "prof-avatar-a";

const ownerCtxA = () =>
  makeMembershipContext({ barbershopId: SHOP_A, role: "owner" });

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFile(
  opts: { type?: string; sizeBytes?: number; name?: string } = {},
): File {
  const { type = "image/jpeg", sizeBytes = 1024, name = "photo.jpg" } = opts;
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function makeFormData(file: File): FormData {
  const fd = new FormData();
  fd.append("avatar", file);
  return fd;
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue(ownerCtxA());
  vi.mocked(db.professional.update).mockResolvedValue({} as never);
});

// ── uploadProfessionalAvatar ────────────────────────────────────────────────────

describe("uploadProfessionalAvatar", () => {
  describe("cross-tenant guard", () => {
    it("returns error when professional belongs to a different barbershop", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      const result = await uploadProfessionalAvatar(
        "prof-from-shop-b",
        makeFormData(makeFile()),
      );

      expect(result).toEqual({
        success: false,
        error: "Profissional não encontrado.",
      });
    });

    it("scopes findFirst lookup to the authenticated owner's barbershopId", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await uploadProfessionalAvatar("any-id", makeFormData(makeFile()));

      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });

    it("does not call put when professional is not found", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await uploadProfessionalAvatar("any-id", makeFormData(makeFile()));

      expect(vi.mocked(put)).not.toHaveBeenCalled();
    });

    it("proceeds to upload when professional belongs to the same barbershop", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/photo.jpg",
      } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile()),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("file type validation (server-side)", () => {
    beforeEach(() => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );
    });

    it("rejects application/pdf", async () => {
      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ type: "application/pdf", name: "doc.pdf" })),
      );

      expect(result).toEqual({
        success: false,
        error: "Formato inválido. Use JPEG, PNG ou WebP.",
      });
    });

    it("rejects image/gif", async () => {
      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ type: "image/gif", name: "anim.gif" })),
      );

      expect(result.success).toBe(false);
    });

    it("rejects image/svg+xml", async () => {
      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ type: "image/svg+xml", name: "icon.svg" })),
      );

      expect(result.success).toBe(false);
    });

    it("accepts image/jpeg", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/photo.jpg",
      } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ type: "image/jpeg" })),
      );

      expect(result.success).toBe(true);
    });

    it("accepts image/png", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/photo.png",
      } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ type: "image/png", name: "photo.png" })),
      );

      expect(result.success).toBe(true);
    });

    it("accepts image/webp", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/photo.webp",
      } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ type: "image/webp", name: "photo.webp" })),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("file size validation (server-side)", () => {
    beforeEach(() => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );
    });

    it("rejects files 1 byte over the 5 MB limit", async () => {
      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ sizeBytes: 5 * 1024 * 1024 + 1 })),
      );

      expect(result).toEqual({
        success: false,
        error: "Arquivo muito grande. Máximo 5 MB.",
      });
    });

    it("accepts files exactly at the 5 MB limit", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/photo.jpg",
      } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ sizeBytes: 5 * 1024 * 1024 })),
      );

      expect(result.success).toBe(true);
    });

    it("accepts small files well under the limit", async () => {
      const { put } = await import("@vercel/blob");
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/photo.jpg",
      } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile({ sizeBytes: 100 * 1024 })),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("blob lifecycle", () => {
    it("deletes the old blob before uploading a new one", async () => {
      const { put, del } = await import("@vercel/blob");
      const oldUrl = "https://old.blob.example.com/old.jpg";
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A, avatarUrl: oldUrl }),
      );
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/new.jpg",
      } as never);

      await uploadProfessionalAvatar(PROF_A, makeFormData(makeFile()));

      expect(vi.mocked(del)).toHaveBeenCalledWith(oldUrl);
    });

    it("skips del when professional has no existing avatar", async () => {
      const { put, del } = await import("@vercel/blob");
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A, avatarUrl: null }),
      );
      vi.mocked(put).mockResolvedValue({
        url: "https://blob.example.com/new.jpg",
      } as never);

      await uploadProfessionalAvatar(PROF_A, makeFormData(makeFile()));

      expect(vi.mocked(del)).not.toHaveBeenCalled();
    });

    it("returns the new avatarUrl in the success result", async () => {
      const { put } = await import("@vercel/blob");
      const newUrl = "https://blob.example.com/new-photo.jpg";
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );
      vi.mocked(put).mockResolvedValue({ url: newUrl } as never);

      const result = await uploadProfessionalAvatar(
        PROF_A,
        makeFormData(makeFile()),
      );

      expect(result).toEqual({
        success: true,
        message: "Foto atualizada com sucesso.",
        avatarUrl: newUrl,
      });
    });

    it("persists the new URL to the database", async () => {
      const { put } = await import("@vercel/blob");
      const newUrl = "https://blob.example.com/new-photo.jpg";
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );
      vi.mocked(put).mockResolvedValue({ url: newUrl } as never);

      await uploadProfessionalAvatar(PROF_A, makeFormData(makeFile()));

      expect(vi.mocked(db.professional.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { avatarUrl: newUrl },
        }),
      );
    });
  });
});

// ── removeProfessionalAvatar ───────────────────────────────────────────────────

describe("removeProfessionalAvatar", () => {
  describe("cross-tenant guard", () => {
    it("returns error when professional belongs to a different barbershop", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      const result = await removeProfessionalAvatar("prof-from-shop-b");

      expect(result).toEqual({
        success: false,
        error: "Profissional não encontrado.",
      });
    });

    it("scopes findFirst lookup to the authenticated owner's barbershopId", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(null);

      await removeProfessionalAvatar("any-id");

      expect(vi.mocked(db.professional.findFirst)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: SHOP_A }),
        }),
      );
    });
  });

  describe("blob cleanup", () => {
    it("deletes the blob when avatarUrl exists", async () => {
      const { del } = await import("@vercel/blob");
      const url = "https://blob.example.com/photo.jpg";
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A, avatarUrl: url }),
      );

      await removeProfessionalAvatar(PROF_A);

      expect(vi.mocked(del)).toHaveBeenCalledWith(url);
    });

    it("skips del when professional has no avatar", async () => {
      const { del } = await import("@vercel/blob");
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A, avatarUrl: null }),
      );

      await removeProfessionalAvatar(PROF_A);

      expect(vi.mocked(del)).not.toHaveBeenCalled();
    });
  });

  describe("database update", () => {
    it("sets avatarUrl to null in the database", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );

      await removeProfessionalAvatar(PROF_A);

      expect(vi.mocked(db.professional.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { avatarUrl: null },
        }),
      );
    });

    it("returns success message on removal", async () => {
      vi.mocked(db.professional.findFirst).mockResolvedValue(
        makeProfessional({ id: PROF_A, barbershopId: SHOP_A }),
      );

      const result = await removeProfessionalAvatar(PROF_A);

      expect(result).toEqual({
        success: true,
        message: "Foto removida com sucesso.",
      });
    });
  });
});
