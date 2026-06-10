"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

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
