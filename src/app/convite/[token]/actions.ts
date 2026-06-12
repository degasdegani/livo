"use server";

import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { InvitationStatus, MemberRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type AcceptInvitationInput =
  | {
      token: string;
      mode: "existing";
    }
  | {
      token: string;
      mode: "create";
      name: string;
      password: string;
    };

type ActionResult = { success: true } | { success: false; error: string };

// ─── Aceitar convite ───────────────────────────────────────────────────────────

export async function acceptInvitationAction(
  input: AcceptInvitationInput,
): Promise<ActionResult> {
  const invitation = await db.invitation.findUnique({
    where: { token: input.token },
  });

  if (!invitation) {
    log.convite.warn("convite não encontrado", { token: input.token });
    return { success: false, error: "Convite não encontrado." };
  }

  if (invitation.status !== InvitationStatus.pending) {
    log.convite.warn("convite indisponível", {
      invitationId: invitation.id,
      status: invitation.status,
    });
    return { success: false, error: "Este convite não está mais disponível." };
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.expired },
    });
    log.convite.warn("convite expirado", { invitationId: invitation.id });
    return { success: false, error: "Este convite expirou." };
  }

  let userId: string;

  if (input.mode === "existing") {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error:
          "Você precisa estar logado para aceitar com uma conta existente.",
      };
    }
    userId = session.user.id as string;
  } else {
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return {
        success: false,
        error:
          "Este e-mail já está cadastrado. Faça login e tente aceitar novamente.",
      };
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const newUser = await db.user.create({
      data: {
        name: input.name,
        email: invitation.email,
        password: hashedPassword,
      },
    });

    userId = newUser.id;
    log.convite.info("usuário criado via convite", {
      userId,
      barbershopId: invitation.barbershopId,
    });
  }

  const alreadyMember = await db.membership.findFirst({
    where: {
      userId,
      barbershopId: invitation.barbershopId,
      isActive: true,
    },
  });

  if (alreadyMember) {
    return {
      success: false,
      error: "Você já é membro desta barbearia.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        role: invitation.role as MemberRole,
        userId,
        barbershopId: invitation.barbershopId,
        professionalId: invitation.professionalId ?? null,
        commissionOnServices: invitation.commissionOnServices,
        commissionOnProducts: invitation.commissionOnProducts,
        isActive: true,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.accepted,
        acceptedAt: new Date(),
      },
    });
  });

  log.convite.info("convite aceito com sucesso", {
    userId,
    barbershopId: invitation.barbershopId,
    role: invitation.role,
    mode: input.mode,
  });

  if (input.mode === "create") {
    try {
      await signIn("credentials", {
        email: invitation.email,
        password: input.password,
        redirect: false,
      });
    } catch {
      // signIn pode lançar erro de redirect — é normal, continuamos
    }
  }

  redirect("/dashboard");
}
