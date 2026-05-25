"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PRESET_SERVICES } from "./data";

const DEFAULT_HOURS = [
  { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 6, isOpen: true, openTime: "09:00", closeTime: "13:00" },
];

const RESERVED_SLUGS = [
  "login",
  "register",
  "dashboard",
  "onboarding",
  "api",
  "admin",
  "app",
  "www",
  "mail",
  "livo",
];

interface CreateBarbershopData {
  name: string;
  slug: string;
  phone?: string;
  city?: string;
  selectedServices: string[];
}

interface ActionResult {
  success?: boolean;
  error?: string;
}

export async function createBarbershop(
  data: CreateBarbershopData,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Você precisa estar logado." };
    }

    const userId = session.user.id;

    if (RESERVED_SLUGS.includes(data.slug.toLowerCase())) {
      return { error: "Esse endereço não está disponível. Escolha outro." };
    }

    if (!data.name || data.name.trim().length < 2) {
      return {
        error: "O nome da barbearia precisa ter pelo menos 2 caracteres.",
      };
    }

    if (!data.slug || data.slug.trim().length < 2) {
      return {
        error: "O endereço público precisa ter pelo menos 2 caracteres.",
      };
    }

    if (data.selectedServices.length === 0) {
      return { error: "Selecione pelo menos 1 serviço." };
    }

    const slugExisting = await db.barbershop.findUnique({
      where: { slug: data.slug.toLowerCase() },
    });
    if (slugExisting) {
      return { error: "Esse endereço já está em uso. Escolha outro." };
    }

    const userHasBarbershop = await db.barbershop.findUnique({
      where: { ownerId: userId },
    });
    if (userHasBarbershop) {
      return { error: "Você já tem uma barbearia cadastrada." };
    }

    await db.$transaction(async (tx) => {
      const barbershop = await tx.barbershop.create({
        data: {
          name: data.name.trim(),
          slug: data.slug.toLowerCase().trim(),
          phone: data.phone?.trim() || null,
          city: data.city?.trim() || null,
          ownerId: userId,
          plan: "start",
        },
      });

      await tx.professional.create({
        data: {
          name: session.user!.name || "Profissional",
          isActive: true,
          barbershopId: barbershop.id,
        },
      });

      const servicesToCreate = PRESET_SERVICES.filter((s) =>
        data.selectedServices.includes(s.name),
      );

      await tx.service.createMany({
        data: servicesToCreate.map((s) => ({
          name: s.name,
          durationMin: s.durationMin,
          priceInCents: s.priceInCents,
          isActive: true,
          barbershopId: barbershop.id,
        })),
      });

      await tx.businessHour.createMany({
        data: DEFAULT_HOURS.map((h) => ({
          ...h,
          barbershopId: barbershop.id,
        })),
      });
    });

    return { success: true };
  } catch (err) {
    console.error("[createBarbershop] Erro:", err);
    return { error: "Erro ao criar barbearia. Tente novamente." };
  }
}
