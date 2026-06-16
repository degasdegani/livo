"use server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireRole } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { recalcularComissoesPendentes } from "../comissoes/actions";

// ─── ATUALIZAR COMISSÃO DO MEMBRO ─────────────────────────────────────────────

export async function updateMembershipComissao(data: {
  membershipId: string;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
  commissionServicePct: number | null;
  commissionProductPct: number | null;
}): Promise<{ atualizados: number }> {
  const membership = await requireRole("owner");

  const target = await db.membership.findFirst({
    where: { id: data.membershipId, barbershopId: membership.barbershopId },
  });

  if (!target) throw new Error("Membro não encontrado.");
  if (target.role === MemberRole.owner) {
    throw new Error("Owner não tem comissão configurável.");
  }

  await db.membership.update({
    where: { id: data.membershipId },
    data: {
      commissionOnServices: data.commissionOnServices,
      commissionOnProducts: data.commissionOnProducts,
      commissionServicePct: data.commissionServicePct,
      commissionProductPct: data.commissionProductPct,
    },
  });

  revalidatePath("/dashboard/settings/acessos");
  revalidatePath("/dashboard/comissoes");

  // Recalcula retroativamente itens pendentes (commissionValue null) de
  // comandas já fechadas desse profissional, agora que a comissão mudou.
  let atualizados = 0;
  if (target.professionalId) {
    const resultado = await recalcularComissoesPendentes(
      target.professionalId,
    );
    atualizados = resultado.atualizados;
  }

  return { atualizados };
}

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────

function parsePriceToCents(price: string): number {
  return Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100);
}

export async function addService(_: unknown, formData: FormData) {
  const membership = await requireRole("owner");

  try {
    const name = String(formData.get("name") || "").trim();
    const duration = Number(formData.get("duration"));
    const price = String(formData.get("price") || "0");

    if (!name) return { error: "Nome do serviço obrigatório." };

    await db.service.create({
      data: {
        name,
        durationMin: duration,
        priceInCents: parsePriceToCents(price),
        barbershopId: membership.barbershopId,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    log.error("erro ao criar serviço", { barbershopId: membership.barbershopId }, err);
    return { error: "Erro ao criar serviço." };
  }
}

export async function updateService(_: unknown, formData: FormData) {
  const membership = await requireRole("owner");

  try {
    const serviceId = String(formData.get("serviceId"));
    const name = String(formData.get("name") || "").trim();
    const duration = Number(formData.get("duration"));
    const price = String(formData.get("price") || "0");

    const service = await db.service.findFirst({
      where: { id: serviceId, barbershopId: membership.barbershopId },
    });

    if (!service) return { error: "Serviço não encontrado." };

    await db.service.update({
      where: { id: serviceId },
      data: {
        name,
        durationMin: duration,
        priceInCents: parsePriceToCents(price),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    log.error("erro ao atualizar serviço", { barbershopId: membership.barbershopId }, err);
    return { error: "Erro ao atualizar serviço." };
  }
}

export async function deleteService(serviceId: string) {
  const membership = await requireRole("owner");

  const service = await db.service.findFirst({
    where: { id: serviceId, barbershopId: membership.barbershopId },
  });

  if (!service) throw new Error("Serviço não encontrado.");

  await db.service.delete({ where: { id: serviceId } });

  revalidatePath("/dashboard/settings");
}

export async function toggleServiceActive(serviceId: string) {
  const membership = await requireRole("owner");

  const service = await db.service.findFirst({
    where: { id: serviceId, barbershopId: membership.barbershopId },
  });

  if (!service) throw new Error("Serviço não encontrado.");

  await db.service.update({
    where: { id: serviceId },
    data: { isActive: !service.isActive },
  });

  revalidatePath("/dashboard/settings");
}

// ─── INFORMAÇÕES BÁSICAS ──────────────────────────────────────────────────────

export async function updateBasicInfo(_: unknown, formData: FormData) {
  const membership = await requireRole("owner");

  try {
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const city = String(formData.get("city") || "").trim();

    if (!name) return { error: "Nome da barbearia é obrigatório." };

    await db.barbershop.update({
      where: { id: membership.barbershopId },
      data: { name, phone: phone || null, city: city || null },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    log.error("erro ao salvar informações básicas", { barbershopId: membership.barbershopId }, err);
    return { error: "Erro ao salvar informações." };
  }
}

// ─── HORÁRIOS DE FUNCIONAMENTO ────────────────────────────────────────────────

export async function updateBusinessHours(_: unknown, formData: FormData) {
  const membership = await requireRole("owner");

  try {
    const businessHours = await db.businessHour.findMany({
      where: { barbershopId: membership.barbershopId },
    });

    for (const hour of businessHours) {
      const isOpen = formData.get(`isOpen_${hour.dayOfWeek}`) === "true";
      const openTime = String(
        formData.get(`openTime_${hour.dayOfWeek}`) || hour.openTime,
      );
      const closeTime = String(
        formData.get(`closeTime_${hour.dayOfWeek}`) || hour.closeTime,
      );

      await db.businessHour.update({
        where: { id: hour.id },
        data: { isOpen, openTime, closeTime },
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    log.error("erro ao salvar horários de funcionamento", { barbershopId: membership.barbershopId }, err);
    return { error: "Erro ao salvar horários." };
  }
}

// ─── DADOS PESSOAIS DO OWNER ──────────────────────────────────────────────────

export async function updatePersonalInfo(_: unknown, formData: FormData) {
  const membership = await requireRole("owner");

  try {
    const name = String(formData.get("name") || "").trim();
    const cpf = String(formData.get("cpf") || "").replace(/\D/g, "") || null;
    const birthDate = String(formData.get("birthDate") || "") || null;
    const phone =
      String(formData.get("phone") || "").replace(/\D/g, "") || null;

    if (!name) return { error: "Nome é obrigatório." };

    await db.user.update({
      where: { id: membership.userId },
      data: {
        name,
        cpf: cpf || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    if (phone) {
      await db.barbershop.update({
        where: { id: membership.barbershopId },
        data: { phone },
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    log.error("erro ao salvar dados pessoais", { barbershopId: membership.barbershopId }, err);
    return { error: "Erro ao salvar dados pessoais." };
  }
}
