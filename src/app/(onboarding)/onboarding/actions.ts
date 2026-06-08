// src/app/(onboarding)/onboarding/actions.ts
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PRESET_SERVICES } from "./data";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createBarbershop(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Dados do dono
  const fullName = (formData.get("fullName") as string)?.trim();
  const cpfRaw = (formData.get("cpf") as string)?.replace(/\D/g, "");
  const birthDateRaw = formData.get("birthDate") as string;
  const phone = (formData.get("phone") as string)?.replace(/\D/g, "");

  // Dados da barbearia
  const barbershopName = (formData.get("barbershopName") as string)?.trim();
  const slugInput = (formData.get("slug") as string)?.trim();

  // Endereço — obrigatório a partir do Dia 3
  const street = (formData.get("street") as string)?.trim();
  const neighborhood = (formData.get("neighborhood") as string)?.trim();
  const cep = (formData.get("cep") as string)?.replace(/\D/g, "");
  const city = (formData.get("city") as string)?.trim();
  const state = (formData.get("state") as string)?.trim();

  // Telefone fixo (opcional)
  const landline =
    (formData.get("landline") as string)?.replace(/\D/g, "") || null;

  // Validações básicas no server
  if (!fullName || !barbershopName || !slugInput || !phone) {
    throw new Error("Campos obrigatórios faltando.");
  }
  if (!street || !neighborhood || !cep || !city) {
    throw new Error("Endereço completo é obrigatório.");
  }

  const slug = slugify(slugInput);

  // Verifica slug disponível
  const existing = await db.barbershop.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("Este link já está em uso. Escolha outro.");
  }

  // Verifica CPF duplicado (se fornecido)
  if (cpfRaw) {
    const cpfExisting = await db.user.findUnique({ where: { cpf: cpfRaw } });
    if (cpfExisting && cpfExisting.id !== userId) {
      throw new Error("CPF já cadastrado no sistema.");
    }
  }
  if (birthDateRaw && birthDateRaw.length < 10) {
    throw new Error("Data de nascimento inválida.");
  }
  // Converte birthDate para Date
  let birthDate: Date | null = null;
  if (birthDateRaw && birthDateRaw.length === 10) {
    const parsed = new Date(birthDateRaw + "T12:00:00.000Z");
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
  }

  // Trial: 30 dias para todos; 60 dias para os 14 leads do workshop TX.
  // Consulta SOMENTE LEITURA em WaitlistLead — nunca escreve nem deleta.
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

  // Transação única: User atualizado + Barbershop + Professional + Membership + Services + BusinessHours
  await db.$transaction(async (tx) => {
    // 1. Atualiza dados do User (dono)
    await tx.user.update({
      where: { id: userId },
      data: {
        name: fullName,
        ...(cpfRaw ? { cpf: cpfRaw } : {}),
        ...(birthDate ? { birthDate } : {}),
      },
    });

    // 2. Cria a barbearia com endereço estruturado
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
        plan: "start", // atualizado manualmente para pro via Prisma Studio
        planStatus: "trial",
        trialEndsAt,
        ownerId: userId,
      },
    });

    // 3. Cria o Professional (perfil do dono como barbeiro)
    const professional = await tx.professional.create({
      data: {
        name: fullName,
        isActive: true,
        barbershopId: barbershop.id,
      },
    });

    // 4. Cria o Membership de dono, vinculado ao professional
    await tx.membership.create({
      data: {
        role: "owner",
        userId,
        barbershopId: barbershop.id,
        professionalId: professional.id,
        commissionOnServices: true,
        commissionOnProducts: false,
        isActive: true,
      },
    });

    // 5. Cria os serviços pré-configurados
    await tx.service.createMany({
      data: PRESET_SERVICES.map((s) => ({
        ...s,
        barbershopId: barbershop.id,
      })),
    });

    // 6. Cria horários padrão (seg–sab aberto, dom fechado)
    const defaultHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      dayOfWeek: day,
      openTime: "09:00",
      closeTime: "18:00",
      isOpen: day !== 0, // domingo fechado
      barbershopId: barbershop.id,
    }));
    await tx.businessHour.createMany({ data: defaultHours });
  });

  redirect("/dashboard");
}
