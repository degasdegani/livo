import { db } from "@/lib/db";

// Mensagem amigável única para CPF já usado (validada em produção). Centralizada
// para não divergir entre a checagem antecipada (Passo 1) e a rede de segurança
// da submissão final (Passo 2).
export const CPF_TAKEN_MESSAGE =
  "Este CPF já está cadastrado em outra conta. Faça login ou entre em contato com o suporte.";

// Verifica se o CPF já pertence a OUTRA conta. Normalização idêntica à usada no
// onboarding (.replace(/\D/g, "")). Node-only (Prisma) — nunca importar em Edge.
// Reusada pelo Passo 1 (validateCpfStepAction) e pela checagem final da action.
export async function checkCpfAvailable(
  cpf: string,
  currentUserId?: string,
): Promise<{ available: boolean }> {
  const cpfRaw = cpf?.replace(/\D/g, "");
  if (!cpfRaw) return { available: true };

  const existing = await db.user.findUnique({ where: { cpf: cpfRaw } });
  if (existing && existing.id !== currentUserId) {
    return { available: false };
  }
  return { available: true };
}
