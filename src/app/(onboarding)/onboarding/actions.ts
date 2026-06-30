// src/app/(onboarding)/onboarding/actions.ts
"use server";

import { Prisma, PlanStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { PRESET_SERVICES } from "./data";

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

export async function createBarbershop(formData: FormData) {
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
    throw new Error("Campos obrigatórios faltando.");
  }
  if (!street || !neighborhood || !cep || !city) {
    throw new Error("Endereço completo é obrigatório.");
  }

  const slug = slugify(slugInput);

  const existing = await db.barbershop.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("Este link já está em uso. Escolha outro.");
  }

  if (cpfRaw) {
    const cpfExisting = await db.user.findUnique({ where: { cpf: cpfRaw } });
    if (cpfExisting && cpfExisting.id !== userId) {
      throw new Error("CPF já cadastrado no sistema.");
    }
  }
  if (birthDateRaw && birthDateRaw.length < 10) {
    throw new Error("Data de nascimento inválida.");
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

  const trialDays = isWaitlistLead ? 60 : 30;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  log.onboarding.info("criando barbearia", {
    userId,
    slug,
    barbershopName,
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
          plan: "start",
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
    log.onboarding.error("erro ao criar barbearia", { userId, slug }, err);
    throw err;
  }

  redirect("/dashboard");
}
