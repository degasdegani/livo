"use server";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";

// ── Dicas contextuais (LIVO-047) ───────────────────────────────────────────
// Registra, por usuário, quais dicas de tela já foram vistas/dispensadas.
// Por pessoa (não por barbearia): um profissional novo no time deve ver a
// dica na sua própria primeira vez, mesmo que colegas já tenham dispensado.

export async function isHintDismissed(hintKey: string): Promise<boolean> {
  const { userId } = await requireMembership();
  const found = await db.hintDismissal.findUnique({
    where: { userId_hintKey: { userId, hintKey } },
  });
  return found !== null;
}

export async function dismissHint(hintKey: string): Promise<void> {
  const { userId } = await requireMembership();
  await db.hintDismissal.upsert({
    where: { userId_hintKey: { userId, hintKey } },
    create: { userId, hintKey },
    update: {},
  });
}
