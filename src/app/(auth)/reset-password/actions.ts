"use server";

import bcrypt from "bcryptjs";
import {
  validatePasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/password-reset";

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  if (!token) {
    return { error: "Token inválido." };
  }

  if (newPassword.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  try {
    const email = await validatePasswordResetToken(token);
    if (!email) {
      return { error: "Link inválido ou expirado. Solicite um novo." };
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await consumePasswordResetToken(token, hash);

    return { success: true };
  } catch {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }
}
