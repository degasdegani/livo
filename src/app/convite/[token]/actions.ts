"use server";

import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { InvitationStatus, MemberRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type AcceptInvitationInput =
  | {
      invitationId: string;
      mode: "existing"; // usuário já logado aceita com a conta atual
    }
  | {
      invitationId: string;
      mode: "create"; // cria conta nova e aceita
      name: string;
      password: string;
    };

type ActionResult = { success: true } | { success: false; error: string };

// ─── Aceitar convite ───────────────────────────────────────────────────────────

export async function acceptInvitationAction(
  input: AcceptInvitationInput,
): Promise<ActionResult> {
  // 1. Busca o convite (fresco, sem cache)
  const invitation = await db.invitation.findUnique({
    where: { id: input.invitationId },
  });

  if (!invitation) {
    return { success: false, error: "Convite não encontrado." };
  }

  if (invitation.status !== InvitationStatus.pending) {
    return { success: false, error: "Este convite não está mais disponível." };
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.expired },
    });
    return { success: false, error: "Este convite expirou." };
  }

  // 2. Determinar o userId que vai receber o crachá
  let userId: string;

  if (input.mode === "existing") {
    // Usuário já logado
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
    // Criar conta nova com o e-mail do convite
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
  }

  // 3. Verificar se este userId já é membro desta barbearia
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

  // 4. Criar o Membership + marcar convite como aceito (transação)
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

  // 5. Se criou conta nova, fazer login automático via credentials
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

  // 6. Redirecionar para o dashboard
  redirect("/dashboard");
}
