"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { sendEmailVerification } from "@/lib/email";
import { log } from "@/lib/logger";

type ResendResult = { success: boolean; error?: string };

// Reenvio do e-mail de confirmação. Só funciona para o usuário autenticado —
// não expomos reenvio por e-mail arbitrário para evitar enumeração/abuso.
// Sem gate: não bloqueia nada, apenas dispara um novo link.
export async function resendVerificationAction(): Promise<ResendResult> {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;

  if (!userId) {
    return { success: false, error: "Faça login para reenviar o e-mail." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailVerified: true },
  });

  if (!user?.email) {
    return { success: false, error: "Conta não encontrada." };
  }

  if (user.emailVerified) {
    return { success: true };
  }

  try {
    const token = await createEmailVerificationToken(userId);
    await sendEmailVerification(user.email, user.name ?? "", token);
    log.auth.info("e-mail de confirmação reenviado", { userId });
    return { success: true };
  } catch (err) {
    log.auth.error("falha ao reenviar confirmação", { userId }, err);
    return { success: false, error: "Erro ao reenviar. Tente novamente." };
  }
}
