"use server";

import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { requireRole } from "@/lib/permissions";
import { canAddMember } from "@/lib/plans";
import { InvitationStatus, MemberRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type CreateInvitationInput = {
  email: string;
  role: "reception" | "barber";
  professionalId?: string;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
};

export type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

// ─── Criar convite ─────────────────────────────────────────────────────────────

export async function createInvitationAction(
  input: CreateInvitationInput,
): Promise<ActionResult> {
  const membership = await requireRole("owner");
  const { barbershopId } = membership;

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, error: "E-mail inválido." };
  }

  if (input.role === "barber" && !input.professionalId) {
    return {
      success: false,
      error: "Selecione qual profissional este barbeiro representa.",
    };
  }

  const existingMember = await db.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { barbershopId, isActive: true },
      },
    },
  });

  if (existingMember && existingMember.memberships.length > 0) {
    return {
      success: false,
      error: "Este e-mail já é membro ativo desta barbearia.",
    };
  }

  const existingInvite = await db.invitation.findFirst({
    where: {
      email,
      barbershopId,
      status: InvitationStatus.pending,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    return {
      success: false,
      error:
        "Já existe um convite pendente para este e-mail. Aguarde o aceite ou revogue o convite anterior.",
    };
  }

  const canAdd = await canAddMember(barbershopId);
  if (!canAdd) {
    return {
      success: false,
      error:
        "Limite de membros do seu plano atingido. Faça upgrade para adicionar mais pessoas.",
    };
  }

  if (input.role === "barber" && input.professionalId) {
    const professionalAlreadyLinked = await db.membership.findFirst({
      where: {
        barbershopId,
        professionalId: input.professionalId,
        isActive: true,
      },
    });

    if (professionalAlreadyLinked) {
      return {
        success: false,
        error: "Este profissional já possui um login vinculado.",
      };
    }
  }

  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    include: { owner: { select: { name: true } } },
  });

  if (!barbershop) {
    return { success: false, error: "Barbearia não encontrada." };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.invitation.create({
    data: {
      email,
      role: input.role as MemberRole,
      token,
      status: InvitationStatus.pending,
      expiresAt,
      professionalId: input.professionalId ?? null,
      commissionOnServices: input.commissionOnServices,
      commissionOnProducts: input.commissionOnProducts,
      barbershopId,
      invitedById: membership.userId,
    },
  });

  await sendInvitationEmail({
    to: email,
    barbershopName: barbershop.name,
    inviterName: barbershop.owner.name ?? "O dono da barbearia",
    role: input.role,
    token,
  });

  revalidatePath("/dashboard/settings/acessos");
  return { success: true, message: `Convite enviado para ${email}.` };
}

// ─── Revogar acesso (membro já aceito) ─────────────────────────────────────────

export async function revokeMembershipAction(
  membershipId: string,
): Promise<ActionResult> {
  const currentMembership = await requireRole("owner");

  const target = await db.membership.findFirst({
    where: {
      id: membershipId,
      barbershopId: currentMembership.barbershopId,
    },
  });

  if (!target) {
    return { success: false, error: "Membro não encontrado." };
  }

  if (target.role === MemberRole.owner) {
    return {
      success: false,
      error: "Não é possível revogar o acesso do dono.",
    };
  }

  await db.membership.update({
    where: { id: membershipId },
    data: { isActive: false },
  });

  revalidatePath("/dashboard/settings/acessos");
  return { success: true, message: "Acesso revogado com sucesso." };
}

// ─── Revogar convite pendente ──────────────────────────────────────────────────

export async function revokeInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const membership = await requireRole("owner");

  const invitation = await db.invitation.findFirst({
    where: {
      id: invitationId,
      barbershopId: membership.barbershopId,
    },
  });

  if (!invitation) {
    return { success: false, error: "Convite não encontrado." };
  }

  if (invitation.status !== InvitationStatus.pending) {
    return {
      success: false,
      error: "Este convite não está mais pendente.",
    };
  }

  await db.invitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.revoked },
  });

  revalidatePath("/dashboard/settings/acessos");
  return { success: true, message: "Convite revogado." };
}

// ─── Reenviar convite ─────────────────────────────────────────────────────────

export async function resendInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const currentMembership = await requireRole("owner");

  const invitation = await db.invitation.findFirst({
    where: {
      id: invitationId,
      barbershopId: currentMembership.barbershopId,
    },
  });

  if (!invitation) {
    return { success: false, error: "Convite não encontrado." };
  }

  const barbershop = await db.barbershop.findUnique({
    where: { id: currentMembership.barbershopId },
    include: { owner: { select: { name: true } } },
  });

  if (!barbershop) {
    return { success: false, error: "Barbearia não encontrada." };
  }

  const newToken = randomUUID();
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.invitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      status: InvitationStatus.pending,
      expiresAt: newExpiresAt,
    },
  });

  await sendInvitationEmail({
    to: invitation.email,
    barbershopName: barbershop.name,
    inviterName: barbershop.owner.name ?? "O dono da barbearia",
    role: invitation.role as "reception" | "barber",
    token: newToken,
  });

  revalidatePath("/dashboard/settings/acessos");
  return { success: true, message: "Convite reenviado com sucesso." };
}

// ─── Dados para a tela (leitura) ───────────────────────────────────────────────

export async function getAcessosData() {
  const membership = await requireRole("owner");
  const { barbershopId } = membership;

  const [members, pendingInvitations, allProfessionals] = await Promise.all([
    db.membership.findMany({
      where: { barbershopId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        professional: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),

    db.invitation.findMany({
      where: {
        barbershopId,
        status: InvitationStatus.pending,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Busca todos os profissionais ativos da barbearia
    db.professional.findMany({
      where: { barbershopId, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  // IDs de profissionais que já têm membership ativo (com professionalId preenchido)
  const linkedProfessionalIds = new Set(
    members
      .map((m) => m.professionalId)
      .filter((id): id is string => id !== null),
  );

  // Também exclui profissionais com convite pendente
  const invitedProfessionalIds = new Set(
    pendingInvitations
      .map((i) => i.professionalId)
      .filter((id): id is string => id !== null),
  );

  // Profissionais disponíveis = sem membership ativo E sem convite pendente
  const professionals = allProfessionals.filter(
    (p) =>
      !linkedProfessionalIds.has(p.id) && !invitedProfessionalIds.has(p.id),
  );

  return { members, pendingInvitations, professionals };
}
