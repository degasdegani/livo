"use server";

import type { Prisma } from "@prisma/client";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { uploadImageToBlob } from "@/lib/blob-upload";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireModuleAccess } from "@/lib/modules";
import { requireRole } from "@/lib/permissions";
import { captureEvent } from "@/lib/posthog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ProfessionalWithDetails = Prisma.ProfessionalGetPayload<{
  include: {
    membership: {
      include: {
        user: { select: { id: true; name: true; email: true; image: true } };
      };
    };
    _count: { select: { appointments: true; comandas: true } };
  };
}>;

export type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export type ToggleProfessionalResult =
  | { success: true; message: string }
  | { success: false; error: string }
  | { success: false; requiresConfirm: true; futureAppointments: number };

// ─── Listar profissionais ─────────────────────────────────────────────────────

export async function getProfessionalsData(): Promise<
  ProfessionalWithDetails[]
> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  return db.professional.findMany({
    where: { barbershopId: membership.barbershopId },
    include: {
      membership: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      _count: {
        select: {
          appointments: true,
          comandas: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

// ─── Criar profissional ───────────────────────────────────────────────────────

export async function createProfessional(data: {
  name: string;
  bio?: string;
}): Promise<ActionResult> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  const name = data.name.trim();
  if (!name) {
    return { success: false, error: "Nome do profissional é obrigatório." };
  }
  if (name.length > 100) {
    return { success: false, error: "Nome deve ter no máximo 100 caracteres." };
  }

  const bio = data.bio?.trim() || null;
  if (bio && bio.length > 500) {
    return { success: false, error: "Bio deve ter no máximo 500 caracteres." };
  }

  await db.professional.create({
    data: {
      name,
      bio,
      barbershopId: membership.barbershopId,
      isActive: true,
    },
  });

  try {
    captureEvent(membership.barbershopId, "profissional_adicionado", membership.barbershopId, {
      source: "perfil_sem_login",
    });
  } catch (err) {
    log.error("falha ao registrar evento de analytics (profissional_adicionado)", {
      barbershopId: membership.barbershopId,
    }, err);
  }

  revalidatePath("/dashboard/profissionais");
  revalidatePath("/dashboard/settings/acessos");

  return { success: true, message: `${name} adicionado com sucesso.` };
}

// ─── Editar profissional ──────────────────────────────────────────────────────

export async function updateProfessional(
  professionalId: string,
  data: { name: string; bio?: string },
): Promise<ActionResult> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  const professional = await db.professional.findFirst({
    where: {
      id: professionalId,
      barbershopId: membership.barbershopId,
    },
  });

  if (!professional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  const name = data.name.trim();
  if (!name) {
    return { success: false, error: "Nome do profissional é obrigatório." };
  }
  if (name.length > 100) {
    return { success: false, error: "Nome deve ter no máximo 100 caracteres." };
  }

  const bio = data.bio?.trim() || null;
  if (bio && bio.length > 500) {
    return { success: false, error: "Bio deve ter no máximo 500 caracteres." };
  }

  await db.professional.update({
    where: { id: professionalId },
    data: { name, bio },
  });

  revalidatePath("/dashboard/profissionais");
  revalidatePath("/dashboard/settings/acessos");

  return { success: true, message: "Profissional atualizado com sucesso." };
}

// ─── Ativar / Desativar profissional ─────────────────────────────────────────

export async function toggleProfessionalActive(
  professionalId: string,
  confirmDeactivate = false,
): Promise<ToggleProfessionalResult> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  const professional = await db.professional.findFirst({
    where: {
      id: professionalId,
      barbershopId: membership.barbershopId,
    },
  });

  if (!professional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  if (professional.isActive && !confirmDeactivate) {
    const futureCount = await db.appointment.count({
      where: {
        professionalId,
        barbershopId: membership.barbershopId,
        date: { gt: new Date() },
        status: { notIn: ["cancelled", "no_show"] },
      },
    });

    if (futureCount > 0) {
      return {
        success: false,
        requiresConfirm: true,
        futureAppointments: futureCount,
      };
    }
  }

  await db.professional.update({
    where: { id: professionalId },
    data: { isActive: !professional.isActive },
  });

  revalidatePath("/dashboard/profissionais");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/settings/acessos");

  const label = professional.isActive ? "desativado" : "reativado";
  return { success: true, message: `Profissional ${label} com sucesso.` };
}

// ─── Excluir profissional ─────────────────────────────────────────────────────

export async function deleteProfessional(
  professionalId: string,
): Promise<ActionResult> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  const professional = await db.professional.findFirst({
    where: {
      id: professionalId,
      barbershopId: membership.barbershopId,
    },
    include: {
      _count: { select: { appointments: true, comandas: true } },
    },
  });

  if (!professional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  if (
    professional._count.appointments > 0 ||
    professional._count.comandas > 0
  ) {
    return {
      success: false,
      error:
        "Profissional possui histórico de atendimentos ou comandas. Apenas desativação é permitida.",
    };
  }

  await db.professional.delete({ where: { id: professionalId } });

  revalidatePath("/dashboard/profissionais");
  revalidatePath("/dashboard/settings/acessos");

  return { success: true, message: "Profissional excluído com sucesso." };
}

// ─── Upload / remoção de avatar ───────────────────────────────────────────────

export type AvatarUploadResult =
  | { success: true; message: string; avatarUrl: string }
  | { success: false; error: string };

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadProfessionalAvatar(
  professionalId: string,
  formData: FormData,
): Promise<AvatarUploadResult> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  const professional = await db.professional.findFirst({
    where: { id: professionalId, barbershopId: membership.barbershopId },
  });
  if (!professional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { success: false, error: "Arquivo inválido." };
  }

  const uploaded = await uploadImageToBlob({
    file,
    pathPrefix: `professionals/${membership.barbershopId}/${professionalId}`,
    maxBytes: MAX_AVATAR_BYTES,
    allowedTypes: ALLOWED_AVATAR_TYPES,
  });
  if ("error" in uploaded) {
    return { success: false, error: uploaded.error };
  }

  // Remove a foto antiga só depois do upload novo ter sido confirmado.
  if (professional.avatarUrl) {
    try { await del(professional.avatarUrl); } catch {}
  }

  await db.professional.update({
    where: { id: professionalId },
    data: { avatarUrl: uploaded.url },
  });

  revalidatePath("/dashboard/profissionais");

  return { success: true, message: "Foto atualizada.", avatarUrl: uploaded.url };
}

export async function removeProfessionalAvatar(
  professionalId: string,
): Promise<ActionResult> {
  const membership = await requireRole("owner");
  await requireModuleAccess(membership.barbershopId, "profissionais");

  const professional = await db.professional.findFirst({
    where: { id: professionalId, barbershopId: membership.barbershopId },
  });
  if (!professional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  if (professional.avatarUrl) {
    try { await del(professional.avatarUrl); } catch {}
  }

  await db.professional.update({
    where: { id: professionalId },
    data: { avatarUrl: null },
  });

  revalidatePath("/dashboard/profissionais");

  return { success: true, message: "Foto removida com sucesso." };
}
