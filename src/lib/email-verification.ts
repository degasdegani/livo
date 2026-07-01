import { db } from "@/lib/db";
import { generateRawToken, hashToken } from "@/lib/token-hash";

// Confirmação de posse de e-mail. Espelha o padrão de src/lib/password-reset.ts:
// token cru só na URL/e-mail, hash SHA-256 no banco, TTL, uso único via usedAt.
// Node-only (Prisma + node:crypto) — nunca importar em Edge.

const EXPIRES_IN_MS = 24 * 60 * 60 * 1000; // 24h

export type ConsumeResult =
  | { success: true }
  | { success: false; reason: "invalid" | "expired" | "used" };

export async function createEmailVerificationToken(
  userId: string,
): Promise<string> {
  // Escopo restrito a este fluxo e a este usuário: invalida apenas tokens de
  // confirmação anteriores ainda não usados do próprio userId.
  await db.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = generateRawToken();

  await db.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EXPIRES_IN_MS),
    },
  });

  return token;
}

export async function consumeEmailVerificationToken(
  token: string,
): Promise<ConsumeResult> {
  const tokenHash = hashToken(token);

  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return { success: false, reason: "invalid" };
  if (record.usedAt !== null) return { success: false, reason: "used" };
  if (record.expiresAt < new Date()) return { success: false, reason: "expired" };

  await db.$transaction(async (tx) => {
    // Revalida dentro da transação para evitar duplo consumo concorrente.
    const fresh = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!fresh || fresh.usedAt !== null || fresh.expiresAt < new Date()) {
      throw new Error("Token inválido");
    }

    await tx.emailVerificationToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { id: fresh.userId },
      data: { emailVerified: new Date() },
    });
  });

  return { success: true };
}
