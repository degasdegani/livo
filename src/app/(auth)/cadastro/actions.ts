"use server";

import { Prisma, PlanStatus } from "@prisma/client";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { sendEmailVerification, sendWelcomeEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordTermsAcceptance } from "@/lib/terms-record";
import { log } from "@/lib/logger";
import { TRIAL_DAYS } from "@/lib/pricing";
import { normalizeReferralCode } from "@/lib/referral";
import { PRESET_SERVICES } from "@/app/(onboarding)/onboarding/data";
import bcrypt from "bcryptjs";

// LIVO-009 — cadastro unificado (User + Barbershop + Membership + Professional
// numa única submissão). Mesmo padrão de src/app/[slug]/book/actions.ts para IP.
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function registerAndCreateBarbershop(
  prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const ip = await getClientIp();
  const { success: allowed } = await checkRateLimit(`register:${ip}`, 5, 3600);
  if (!allowed) {
    return { error: "Muitas tentativas. Tente novamente mais tarde." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  const barbershopName = (formData.get("barbershopName") as string)?.trim();

  if (!name || !email || !password || !confirm || !barbershopName) {
    return { error: "Preencha todos os campos." };
  }
  if (password !== confirm) {
    return { error: "As senhas não coincidem." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter no mínimo 6 caracteres." };
  }
  if (formData.get("acceptTerms") !== "on") {
    return {
      error: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
    };
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Este e-mail já está cadastrado." };
  }

  const slug = slugify(barbershopName);
  if (!slug) {
    return { error: "Nome da barbearia inválido." };
  }
  const existingSlug = await db.barbershop.findUnique({ where: { slug } });
  if (existingSlug) {
    return {
      error: "Este nome de barbearia já está em uso. Escolha um nome diferente.",
    };
  }

  // Trial automático no plano PRO (decisão de produto do LIVO-009).
  const trialDays = TRIAL_DAYS.pro;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  // Programa Embaixadores (A4): mesma resolução silenciosa já usada em
  // onboarding/actions.ts — código ausente/inválido nunca bloqueia o cadastro.
  const ref = normalizeReferralCode(formData.get("ref") as string | null);
  const referrer = ref
    ? await db.barbershop.findUnique({
        where: { referralCode: ref },
        select: { id: true },
      })
    : null;

  const hashedPassword = await bcrypt.hash(password, 12);

  let userId: string;

  try {
    userId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword },
      });

      const barbershop = await tx.barbershop.create({
        data: {
          name: barbershopName,
          slug,
          plan: "pro",
          planStatus: PlanStatus.trial,
          trialEndsAt,
          ownerId: user.id,
          referredByBarbershopId: referrer?.id ?? null,
        },
      });

      const professional = await tx.professional.create({
        data: {
          name,
          isActive: true,
          barbershopId: barbershop.id,
        },
      });

      await tx.membership.create({
        data: {
          role: "owner",
          userId: user.id,
          barbershopId: barbershop.id,
          professionalId: professional.id,
          isActive: true,
        },
      });

      await tx.service.createMany({
        data: PRESET_SERVICES.map((s) => ({
          ...s,
          barbershopId: barbershop.id,
        })),
      });

      const defaultHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: "18:00",
        isOpen: day !== 0,
        barbershopId: barbershop.id,
      }));
      await tx.businessHour.createMany({ data: defaultHours });

      log.onboarding.info("conta criada com sucesso (cadastro unificado)", {
        userId: user.id,
        barbershopId: barbershop.id,
        slug: barbershop.slug,
        trialDays,
      });

      return user.id;
    });
  } catch (err) {
    // P2002 (violação de unicidade): rede de segurança para corridas entre a
    // pré-checagem e o INSERT. Mesmo padrão de onboarding/actions.ts.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = err.meta?.target;
      const fields = Array.isArray(target)
        ? target.map(String)
        : typeof target === "string"
          ? [target]
          : [];
      const hits = (needle: string) => fields.some((f) => f.includes(needle));

      log.onboarding.warn("colisao de unicidade no cadastro unificado (P2002)", {
        slug,
        target: fields,
      });

      if (hits("email")) {
        return { error: "Este e-mail já está cadastrado." };
      }
      if (hits("slug")) {
        return {
          error:
            "Este nome de barbearia já está em uso. Escolha um nome diferente.",
        };
      }
      return {
        error: "Alguns dados já estão cadastrados. Revise e tente novamente.",
      };
    }

    log.onboarding.error("erro ao criar conta (cadastro unificado)", { slug }, err);
    throw err;
  }

  // Registra o aceite dos termos (append-only), só após a conta existir de
  // fato. Antes do auto-login, mesmo padrão de registerUser.
  await recordTermsAcceptance(userId);

  // LIVO-046: falha no provedor de e-mail (Resend) ou na geração do token de
  // verificação nunca pode derrubar o cadastro — User/Barbershop já foram
  // persistidos com sucesso na transação acima. Loga e segue.
  try {
    await sendWelcomeEmail(email, name);
    const verificationToken = await createEmailVerificationToken(userId);
    await sendEmailVerification(email, name, verificationToken);
  } catch (err) {
    log.onboarding.error(
      "falha ao enviar e-mails de cadastro (não bloqueante)",
      { userId },
      err,
    );
  }

  // Login automático e vai direto para o dashboard — não há mais uma segunda
  // tela de onboarding antes de ver o produto (decisão do LIVO-009).
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });

  return null;
}
