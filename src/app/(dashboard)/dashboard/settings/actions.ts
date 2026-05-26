"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getUserBarbershop() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.barbershop.findUnique({ where: { ownerId: session.user.id } });
}

// ── Informações básicas ───────────────────────────────────────
export async function updateBasicInfo(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const barbershop = await getUserBarbershop();
  if (!barbershop) return { error: "Não autorizado." };

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const city = formData.get("city") as string;

  if (!name || name.trim().length < 2)
    return { error: "O nome precisa ter pelo menos 2 caracteres." };

  await db.barbershop.update({
    where: { id: barbershop.id },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      city: city?.trim() || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);
  return { success: true };
}

// ── Serviços ──────────────────────────────────────────────────
export async function addService(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const barbershop = await getUserBarbershop();
  if (!barbershop) return { error: "Não autorizado." };

  const name = formData.get("name") as string;
  const durationStr = formData.get("duration") as string;
  const priceStr = formData.get("price") as string;

  if (!name || name.trim().length < 2) return { error: "Nome inválido." };

  const durationMin = parseInt(durationStr);
  const priceInCents = Math.round(parseFloat(priceStr.replace(",", ".")) * 100);

  if (isNaN(durationMin) || durationMin < 5)
    return { error: "Duração inválida." };
  if (isNaN(priceInCents) || priceInCents < 0)
    return { error: "Preço inválido." };

  await db.service.create({
    data: {
      name: name.trim(),
      durationMin,
      priceInCents,
      isActive: true,
      barbershopId: barbershop.id,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);
  return { success: true };
}

export async function updateService(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const barbershop = await getUserBarbershop();
  if (!barbershop) return { error: "Não autorizado." };

  const serviceId = formData.get("serviceId") as string;
  const name = formData.get("name") as string;
  const durationStr = formData.get("duration") as string;
  const priceStr = formData.get("price") as string;

  if (!name || name.trim().length < 2) return { error: "Nome inválido." };

  const durationMin = parseInt(durationStr);
  const priceInCents = Math.round(parseFloat(priceStr.replace(",", ".")) * 100);

  if (isNaN(durationMin) || durationMin < 5)
    return { error: "Duração inválida." };
  if (isNaN(priceInCents) || priceInCents < 0)
    return { error: "Preço inválido." };

  const service = await db.service.findFirst({
    where: { id: serviceId, barbershopId: barbershop.id },
  });
  if (!service) return { error: "Serviço não encontrado." };

  await db.service.update({
    where: { id: serviceId },
    data: { name: name.trim(), durationMin, priceInCents },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);
  return { success: true };
}

export async function toggleServiceActive(serviceId: string) {
  const barbershop = await getUserBarbershop();
  if (!barbershop) return { error: "Não autorizado." };

  const service = await db.service.findFirst({
    where: { id: serviceId, barbershopId: barbershop.id },
  });
  if (!service) return { error: "Serviço não encontrado." };

  await db.service.update({
    where: { id: serviceId },
    data: { isActive: !service.isActive },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);
  return { success: true };
}

export async function deleteService(serviceId: string) {
  const barbershop = await getUserBarbershop();
  if (!barbershop) return { error: "Não autorizado." };

  const service = await db.service.findFirst({
    where: { id: serviceId, barbershopId: barbershop.id },
  });
  if (!service) return { error: "Serviço não encontrado." };

  await db.service.delete({ where: { id: serviceId } });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);
  return { success: true };
}

// ── Horários ──────────────────────────────────────────────────
export async function updateBusinessHours(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const barbershop = await getUserBarbershop();
  if (!barbershop) return { error: "Não autorizado." };

  const updates = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: formData.get(`isOpen_${dayOfWeek}`) === "true",
    openTime: (formData.get(`openTime_${dayOfWeek}`) as string) || "09:00",
    closeTime: (formData.get(`closeTime_${dayOfWeek}`) as string) || "18:00",
  }));

  await Promise.all(
    updates.map((u) =>
      db.businessHour.updateMany({
        where: { barbershopId: barbershop.id, dayOfWeek: u.dayOfWeek },
        data: {
          isOpen: u.isOpen,
          openTime: u.openTime,
          closeTime: u.closeTime,
        },
      }),
    ),
  );

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);
  return { success: true };
}
