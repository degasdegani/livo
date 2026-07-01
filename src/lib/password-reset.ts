import { db } from "@/lib/db";
import { generateRawToken, hashToken } from "@/lib/token-hash";

const EXPIRES_IN_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(email: string): Promise<string> {
  await db.passwordResetToken.deleteMany({ where: { email } });

  const token = generateRawToken();

  await db.passwordResetToken.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EXPIRES_IN_MS),
    },
  });

  return token;
}

export async function validatePasswordResetToken(
  token: string,
): Promise<string | null> {
  const tokenHash = hashToken(token);

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record) return null;
  if (record.expiresAt < new Date()) return null;
  if (record.usedAt !== null) return null;

  return record.email;
}

export async function consumePasswordResetToken(
  token: string,
  newPasswordHash: string,
): Promise<boolean> {
  const tokenHash = hashToken(token);

  await db.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.expiresAt < new Date() || record.usedAt !== null) {
      throw new Error("Token inválido");
    }

    await tx.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { email: record.email },
      data: { password: newPasswordHash },
    });
  });

  return true;
}
