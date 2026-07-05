// Programa Embaixadores (A5) — geração preguiçosa (lazy) do código de indicação
// e leitura dos dados de indicação da barbearia.
//
// SERVER-ONLY: toca o banco (Prisma) e RBAC. NÃO pode viver em src/lib/referral.ts
// porque aquele módulo é importado por componentes "use client" (register/
// onboarding, da A4) — trazer o PrismaClient para lá vazaria o banco no bundle
// do client. Por isso a geração fica isolada aqui, atrás de "server-only".
import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireRole } from "@/lib/permissions";

// Base pública do app (onde vive /register). Mesmo padrão de src/lib/email.ts.
const REFERRAL_BASE_URL =
  process.env.NEXTAUTH_URL ?? "https://livobarber.com.br";

// Alfabeto sem caracteres ambíguos (sem I, L, O, 0, 1) — mesma preocupação já
// registrada na lição do projeto sobre ids cuid ambíguos. 31 símbolos.
const REFERRAL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8; // 31^8 ≈ 8.5e11 combinações — colisão desprezível
const MAX_GENERATION_ATTEMPTS = 5;

// Sorteio uniforme (randomInt evita viés de módulo) sobre o alfabeto seguro.
function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  }
  return code;
}

// Idempotente: se a barbearia já tem referralCode, apenas retorna. Caso null,
// gera um código único (checa colisão via findUnique antes de gravar; @unique +
// tratamento de P2002 como rede de segurança para corridas). Nunca gera dois
// códigos para a mesma conta.
export async function getOrCreateReferralCode(
  barbershopId: string,
): Promise<string> {
  const existing = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateReferralCode();

    const clash = await db.barbershop.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (clash) continue; // pré-checagem: código já existe, tenta outro

    try {
      const updated = await db.barbershop.update({
        where: { id: barbershopId },
        data: { referralCode: candidate },
        select: { referralCode: true },
      });
      return updated.referralCode as string;
    } catch (err) {
      // P2002: corrida entre a pré-checagem e o update (outro request gravou
      // o mesmo código, ou esta conta ganhou um código concorrente). Relê a
      // conta: se já tem código, devolve; senão tenta outro candidato.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const now = await db.barbershop.findUnique({
          where: { id: barbershopId },
          select: { referralCode: true },
        });
        if (now?.referralCode) return now.referralCode;
        continue;
      }
      throw err;
    }
  }

  log.error("nao foi possivel gerar referralCode unico", { barbershopId });
  throw new Error(
    "Não foi possível gerar o código de indicação. Tente novamente.",
  );
}

export type ReferralData = {
  referralCode: string;
  referralLink: string;
  isEmbaixador: boolean;
  freeMonthCredits: number;
};

// Leitura escopada por membership (owner). Gera o código na primeira vez que
// for necessário (lazy) e monta o link público de indicação.
export async function getReferralData(): Promise<ReferralData> {
  const membership = await requireRole("owner");
  const barbershopId = membership.barbershopId;

  const referralCode = await getOrCreateReferralCode(barbershopId);

  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { isEmbaixador: true, freeMonthCredits: true },
  });

  return {
    referralCode,
    referralLink: `${REFERRAL_BASE_URL}/register?ref=${referralCode}`,
    isEmbaixador: barbershop?.isEmbaixador ?? false,
    freeMonthCredits: barbershop?.freeMonthCredits ?? 0,
  };
}
