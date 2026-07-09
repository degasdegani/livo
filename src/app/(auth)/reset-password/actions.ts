"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import {
  validatePasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

// Mesmo padrão de src/app/[slug]/book/actions.ts.
async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // headers() indisponível fora de contexto Next.js (ex: testes)
  }
  return "unknown";
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  const ip = await getClientIp();
  const { success: allowed } = await checkRateLimit(`reset-password:${ip}`, 5, 600);
  if (!allowed) {
    return { error: "Muitas tentativas. Tente novamente mais tarde." };
  }

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
