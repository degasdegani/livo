"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── LISTAR MEMBROS E CONVITES ───────────────────────────────────────────────

export async function getAcessosData() {
  const membership = await requireRole("owner");

  const [members, invitations] = await Promise.all([
    db.membership.findMany({
      where: { barbershopId: membership.barbershopId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        professional: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.invitation.findMany({
      where: { barbershopId: membership.barbershopId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { members, invitations };
}

// ─── CONVIDAR MEMBRO ─────────────────────────────────────────────────────────

export async function convidarMembro(data: {
  email: string;
  role: MemberRole;
  professionalId?: string;
  commissionOnServices?: boolean;
  commissionOnProducts?: boolean;
  commissionServicePct?: number | null;
  commissionProductPct?: number | null;
}) {
  const membership = await requireRole("owner");

  const barbershop = await db.barbershop.findUnique({
    where: { id: membership.barbershopId },
  });

  // Verificar se já existe membro com esse email
  const existingUser = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    const existingMembership = await db.membership.findUnique({
      where: {
        userId_barbershopId: {
          userId: existingUser.id,
          barbershopId: membership.barbershopId,
        },
      },
    });
    if (existingMembership?.isActive) {
      throw new Error("Este e-mail já tem acesso à barbearia.");
    }
  }

  // Invalidar convites anteriores para esse email
  await db.invitation.updateMany({
    where: {
      barbershopId: membership.barbershopId,
      email: data.email,
      status: "pending",
    },
    data: { status: "expired" },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      email: data.email,
      role: data.role,
      token,
      expiresAt,
      status: "pending",
      barbershopId: membership.barbershopId,
      invitedById: membership.userId,
      professionalId: data.professionalId || null,
      commissionOnServices: data.commissionOnServices ?? false,
      commissionOnProducts: data.commissionOnProducts ?? false,
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/convite/${token}`;
  const roleLabel =
    data.role === "owner"
      ? "Dono"
      : data.role === "reception"
        ? "Recepção"
        : "Barbeiro";

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: data.email,
    subject: `Você foi convidado para ${barbershop?.name ?? "uma barbearia"} no LIVO`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Convite para ${barbershop?.name ?? "Barbearia"}</h2>
        <p>Você foi convidado como <strong>${roleLabel}</strong>.</p>
        <p>Clique no link abaixo para aceitar o convite (válido por 7 dias):</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #C8102E; color: white; text-decoration: none; border-radius: 8px;">Aceitar convite</a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">Se você não esperava este convite, ignore este e-mail.</p>
      </div>
    `,
  });

  revalidatePath("/dashboard/settings/acessos");
  return { success: true };
}

// ─── REVOGAR CONVITE ─────────────────────────────────────────────────────────

export async function revogarConvite(invitationId: string) {
  const membership = await requireRole("owner");

  await db.invitation.updateMany({
    where: { id: invitationId, barbershopId: membership.barbershopId },
    data: { status: "revoked" },
  });

  revalidatePath("/dashboard/settings/acessos");
}

// ─── REENVIAR CONVITE ─────────────────────────────────────────────────────────

export async function reenviarConvite(invitationId: string) {
  const membership = await requireRole("owner");

  const invitation = await db.invitation.findFirst({
    where: { id: invitationId, barbershopId: membership.barbershopId },
  });
  if (!invitation) throw new Error("Convite não encontrado.");

  const barbershop = await db.barbershop.findUnique({
    where: { id: membership.barbershopId },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.invitation.update({
    where: { id: invitationId },
    data: { token, expiresAt, status: "pending" },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/convite/${token}`;
  const roleLabel =
    invitation.role === "owner"
      ? "Dono"
      : invitation.role === "reception"
        ? "Recepção"
        : "Barbeiro";

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: invitation.email,
    subject: `Convite reenviado — ${barbershop?.name ?? "Barbearia"} no LIVO`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Convite reenviado para ${barbershop?.name ?? "Barbearia"}</h2>
        <p>Você foi convidado como <strong>${roleLabel}</strong>.</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #C8102E; color: white; text-decoration: none; border-radius: 8px;">Aceitar convite</a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">Link válido por 7 dias.</p>
      </div>
    `,
  });

  revalidatePath("/dashboard/settings/acessos");
}

// ─── REVOGAR MEMBRO ───────────────────────────────────────────────────────────

export async function revogarMembro(membershipId: string) {
  const membership = await requireRole("owner");

  const target = await db.membership.findFirst({
    where: { id: membershipId, barbershopId: membership.barbershopId },
  });

  if (!target) throw new Error("Membro não encontrado.");
  if (target.role === MemberRole.owner)
    throw new Error("Não é possível remover o dono.");

  await db.membership.update({
    where: { id: membershipId },
    data: { isActive: false },
  });

  revalidatePath("/dashboard/settings/acessos");
}

// ─── ATUALIZAR COMISSÃO DO MEMBRO ─────────────────────────────────────────────

export async function updateMembershipComissao(data: {
  membershipId: string;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
  commissionServicePct: number | null;
  commissionProductPct: number | null;
}) {
  const membership = await requireRole("owner");

  // Garantir que o membership pertence à barbearia do owner
  const target = await db.membership.findFirst({
    where: { id: data.membershipId, barbershopId: membership.barbershopId },
  });

  if (!target) throw new Error("Membro não encontrado.");
  if (target.role === MemberRole.owner) {
    throw new Error("Owner não tem comissão configurável.");
  }

  await db.membership.update({
    where: { id: data.membershipId },
    data: {
      commissionOnServices: data.commissionOnServices,
      commissionOnProducts: data.commissionOnProducts,
      commissionServicePct: data.commissionServicePct,
      commissionProductPct: data.commissionProductPct,
    },
  });

  revalidatePath("/dashboard/settings/acessos");
  revalidatePath("/dashboard/comissoes");
}
