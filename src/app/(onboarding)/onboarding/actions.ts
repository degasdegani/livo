// src/app/(onboarding)/onboarding/actions.ts
"use server";

import { Prisma, PlanStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { CPF_TAKEN_MESSAGE, checkCpfAvailable } from "@/lib/cpf";
import { log } from "@/lib/logger";
import { PRESET_SERVICES } from "./data";

// Checagem antecipada de CPF para o Passo 1 do onboarding: permite bloquear o
// avanço para o Passo 2 antes do usuário preencher o endereço inteiro. Reusa a
// mesma query/mensagem da checagem final. Server Action (Node), chamada pelo
// client no clique de "Próximo".
export async function validateCpfStepAction(
  cpf: string,
): Promise<{ error?: string }> {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  const { available } = await checkCpfAvailable(cpf, userId);
  return available ? {} : { error: CPF_TAKEN_MESSAGE };
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

export async function createBarbershop(
  formData: FormData,
): Promise<{ error: string } | void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const fullName = (formData.get("fullName") as string)?.trim();
  const cpfRaw = (formData.get("cpf") as string)?.replace(/\D/g, "");
  const birthDateRaw = formData.get("birthDate") as string;
  const phone = (formData.get("phone") as string)?.replace(/\D/g, "");

  const barbershopName = (formData.get("barbershopName") as string)?.trim();
  const slugInput = (formData.get("slug") as string)?.trim();

  const street = (formData.get("street") as string)?.trim();
  const neighborhood = (formData.get("neighborhood") as string)?.trim();
  const cep = (formData.get("cep") as string)?.replace(/\D/g, "");
  const city = (formData.get("city") as string)?.trim();
  const state = (formData.get("state") as string)?.trim();

  const _landline =
    (formData.get("landline") as string)?.replace(/\D/g, "") || null;

  if (!fullName || !barbershopName || !slugInput || !phone) {
    return { error: "Preencha todos os campos obrigatórios." };
  }
  if (!street || !neighborhood || !cep || !city) {
    return { error: "Endereço completo é obrigatório." };
  }

  // Usuário que já possui barbearia não está num erro: é um estado válido.
  // Sem esta guarda, tx.barbershop.create dispararia P2002 em ownerId (@unique)
  // numa resubmissão. Redireciona direto para o painel.
  const ownedShop = await db.barbershop.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (ownedShop) {
    redirect("/dashboard");
  }

  const slug = slugify(slugInput);

  const existing = await db.barbershop.findUnique({ where: { slug } });
  if (existing) {
    return {
      error: "Este nome de barbearia já está em uso. Escolha um nome diferente.",
    };
  }

  if (cpfRaw) {
    // Rede de segurança (também cobre corrida entre Passo 1 e submissão).
    const { available } = await checkCpfAvailable(cpfRaw, userId);
    if (!available) {
      return { error: CPF_TAKEN_MESSAGE };
    }
  }
  if (birthDateRaw && birthDateRaw.length < 10) {
    return { error: "Data de nascimento inválida." };
  }

  let birthDate: Date | null = null;
  if (birthDateRaw && birthDateRaw.length === 10) {
    const parsed = new Date(birthDateRaw + "T12:00:00.000Z");
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
  }

  const owner = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const isWaitlistLead = owner?.email
    ? (await db.waitlistLead.findFirst({
        where: { email: { equals: owner.email, mode: "insensitive" } },
        select: { id: true },
      })) !== null
    : false;

  // Plano escolhido no onboarding — validação server-side (whitelist), nunca
  // confiar cru no valor do client. Default seguro = "start".
  const rawPlan = formData.get("plan");
  const plan = rawPlan === "pro" ? "pro" : "start";

  // Trial diferenciado por plano (START 7d, PRO 15d). O tratamento especial de
  // waitlist/TX (60d) permanece por cima — só o trial PADRÃO passa a variar.
  const baseTrial = plan === "pro" ? 15 : 7;
  const trialDays = isWaitlistLead ? 60 : baseTrial;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  log.onboarding.info("criando barbearia", {
    userId,
    slug,
    barbershopName,
    plan,
    trialDays,
    isWaitlistLead,
  });

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: fullName,
          ...(cpfRaw ? { cpf: cpfRaw } : {}),
          ...(birthDate ? { birthDate } : {}),
        },
      });

      const barbershop = await tx.barbershop.create({
        data: {
          name: barbershopName,
          slug,
          phone: phone || null,
          city,
          state: state || null,
          street,
          neighborhood,
          cep,
          plan,
          planStatus: PlanStatus.trial,
          trialEndsAt,
          ownerId: userId,
        },
      });

      const professional = await tx.professional.create({
        data: {
          name: fullName,
          isActive: true,
          barbershopId: barbershop.id,
        },
      });

      await tx.membership.create({
        data: {
          role: "owner",
          userId,
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

      log.onboarding.info("barbearia criada com sucesso", {
        userId,
        barbershopId: barbershop.id,
        slug: barbershop.slug,
        trialDays,
      });
    });
  } catch (err) {
    // Sessao-zumbi: JWT valido apontando para um user que nao existe mais no
    // banco. O tx.user.update lanca P2025. Em vez de quebrar no error boundary,
    // faz logout limpo e manda para /login. signOut lanca NEXT_REDIRECT
    // (controle de fluxo), que propaga normalmente — nao ha catch ao redor
    // deste bloco que possa engoli-lo.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      log.onboarding.warn("sessao invalida no onboarding (user inexistente)", {
        userId,
      });
      await signOut({ redirectTo: "/login" });
    }

    // P2002 (violacao de unicidade): rede de seguranca para corridas entre a
    // pre-checagem e o INSERT. Traduz a coluna em mensagem amigavel em vez de
    // cair no boundary generico. Nao substitui as pre-checagens acima.
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

      log.onboarding.warn("colisao de unicidade no onboarding (P2002)", {
        userId,
        slug,
        target: fields,
      });

      // ownerId: outra requisicao criou a barbearia entre o pre-check e o
      // create. Estado valido — segue para o painel.
      if (hits("ownerId")) {
        redirect("/dashboard");
      }
      if (hits("cpf")) {
        return { error: CPF_TAKEN_MESSAGE };
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

    log.onboarding.error("erro ao criar barbearia", { userId, slug }, err);
    throw err;
  }

  redirect("/dashboard");
}
