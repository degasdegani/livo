"use server";

import bcrypt from "bcryptjs";
import { GoalPeriod, Prisma } from "@prisma/client";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { uploadImageToBlob } from "@/lib/blob-upload";
import { CPF_TAKEN_MESSAGE, checkCpfAvailable } from "@/lib/cpf";
import { log } from "@/lib/logger";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { recalcularComissoesPendentes } from "../comissoes/actions";

// ─── ATUALIZAR COMISSÃO DO PROFISSIONAL ───────────────────────────────────────
// Campos de comissão vivem em Professional (não em Membership) — um
// profissional pode ter comissão configurada mesmo sem login/convite aceito.

export async function updateMembershipComissao(data: {
  professionalId: string;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
  commissionServicePct: number | null;
  commissionProductPct: number | null;
}): Promise<{ atualizados: number }> {
  const membership = await requireRole("owner");

  const target = await db.professional.findFirst({
    where: { id: data.professionalId, barbershopId: membership.barbershopId },
  });

  if (!target) throw new Error("Profissional não encontrado.");

  await db.professional.update({
    where: { id: data.professionalId },
    data: {
      commissionOnServices: data.commissionOnServices,
      commissionOnProducts: data.commissionOnProducts,
      commissionServicePct: data.commissionServicePct,
      commissionProductPct: data.commissionProductPct,
    },
  });

  revalidatePath("/dashboard/settings/acessos");
  revalidatePath("/dashboard/comissoes");
  revalidatePath("/dashboard/profissionais");

  // Recalcula retroativamente itens pendentes (commissionValue null) de
  // comandas já fechadas desse profissional, agora que a comissão mudou.
  const resultado = await recalcularComissoesPendentes(data.professionalId);

  return { atualizados: resultado.atualizados };
}

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────

// O input de preço (CurrencyInput) já envia o valor como inteiro de centavos
// via campo hidden. Mantemos apenas os dígitos por segurança.
function parsePriceToCents(price: string): number {
  return parseInt(price.replace(/\D/g, ""), 10) || 0;
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
    // Telefone persistido como dígitos (o PhoneInput já envia dígitos).
    const phone = String(formData.get("phone") || "").replace(/\D/g, "");
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

// ─── PIN DE SEGURANÇA PARA REABRIR COMANDAS ──────────────────────────────────

export async function updateReopenPin(
  pin: string,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  const membership = await requireRole("owner");

  const cleaned = pin.replace(/\D/g, "");
  if (cleaned.length < 4 || cleaned.length > 6) {
    return { success: false, error: "PIN deve ter entre 4 e 6 dígitos numéricos." };
  }

  const hash = await bcrypt.hash(cleaned, 10);
  await db.barbershop.update({
    where: { id: membership.barbershopId },
    data: { reopenPin: hash },
  });

  revalidatePath("/dashboard/settings");
  return { success: true, message: "PIN configurado com sucesso." };
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

    // Checagem antecipada de CPF duplicado (mesmo padrão do onboarding). Exclui
    // o próprio owner (currentUserId) — sem isso, salvar sem mudar o CPF
    // acusaria falso positivo contra a própria conta.
    if (cpf) {
      const { available } = await checkCpfAvailable(cpf, membership.userId);
      if (!available) return { error: CPF_TAKEN_MESSAGE };
    }

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
    // Rede de segurança: corrida entre a pré-checagem e o update.
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
      if (fields.some((f) => f.includes("cpf"))) {
        return { error: CPF_TAKEN_MESSAGE };
      }
    }
    log.error("erro ao salvar dados pessoais", { barbershopId: membership.barbershopId }, err);
    return { error: "Erro ao salvar dados pessoais." };
  }
}

// ── RANKING TV — METAS & PIN ──────────────────────────────────────

// Upsert meta geral da barbearia (valor em centavos)
export async function upsertBarbershopGoal(
  period: GoalPeriod,
  targetInCents: number,
) {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  await db.barbershopGoal.upsert({
    where: { barbershopId_period: { barbershopId, period } },
    update: { targetInCents },
    create: { barbershopId, period, targetInCents },
  });

  revalidatePath("/dashboard/settings");
}

// Upsert meta individual de profissional (quantidade de serviços)
export async function upsertProfessionalGoal(
  professionalId: string,
  period: GoalPeriod,
  targetServices: number,
) {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  // Garante que o profissional pertence à barbearia
  const professional = await db.professional.findFirst({
    where: { id: professionalId, barbershopId },
  });
  if (!professional) throw new Error("Profissional não encontrado.");

  await db.professionalGoal.upsert({
    where: { professionalId_period: { professionalId, period } },
    update: { targetServices },
    create: { barbershopId, professionalId, period, targetServices },
  });

  revalidatePath("/dashboard/settings");
}

// Gera (ou regenera) PIN de 6 dígitos globalmente único para a barbearia
export async function generateTvPin(): Promise<string> {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  let pin: string;
  let attempts = 0;
  while (true) {
    // 6 dígitos: 000000–999999
    pin = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const conflict = await db.barbershop.findFirst({
      where: { tvPin: pin },
    });
    if (!conflict || conflict.id === barbershopId) break;
    if (++attempts > 20) {
      throw new Error("Não foi possível gerar PIN único. Tente novamente.");
    }
  }

  await db.barbershop.update({
    where: { id: barbershopId },
    data: { tvPin: pin },
  });

  revalidatePath("/dashboard/settings");
  return pin;
}

// Revoga (deleta) um device TV pareado
export async function revokeTvDevice(deviceId: string) {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  await db.tvDevice.deleteMany({
    where: { id: deviceId, barbershopId },
  });

  revalidatePath("/dashboard/settings");
}

// ─── FOTO DE CAPA DA BARBEARIA ────────────────────────────────────────────────
// Espelha o padrão de uploadProfessionalAvatar: RBAC owner, barbershopId do
// membership, uploadImageToBlob reusado, del() da imagem antiga só depois do
// upload novo confirmado, e revalidação da página pública além do Settings.
// A compressão do arquivo acontece no CLIENTE (compressImageFile, maxSide 1600).

export type CoverUploadResult =
  | { success: true; coverPhotoUrl: string }
  | { success: false; error: string };

const ALLOWED_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadBarbershopCover(
  formData: FormData,
): Promise<CoverUploadResult> {
  const membership = await requireRole("owner");
  const barbershopId = membership.barbershopId;

  const barbershop = await db.barbershop.findFirst({
    where: { id: barbershopId },
    select: { coverPhotoUrl: true, slug: true },
  });
  if (!barbershop) {
    return { success: false, error: "Barbearia não encontrada." };
  }

  const file = formData.get("cover");
  if (!(file instanceof File)) {
    return { success: false, error: "Arquivo inválido." };
  }

  const uploaded = await uploadImageToBlob({
    file,
    pathPrefix: `barbershops/${barbershopId}/cover`,
    maxBytes: MAX_COVER_BYTES,
    allowedTypes: ALLOWED_COVER_TYPES,
  });
  if ("error" in uploaded) {
    return { success: false, error: uploaded.error };
  }

  // Remove a capa antiga só depois do upload novo ter sido confirmado.
  if (barbershop.coverPhotoUrl) {
    try { await del(barbershop.coverPhotoUrl); } catch {}
  }

  await db.barbershop.update({
    where: { id: barbershopId },
    data: { coverPhotoUrl: uploaded.url },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);

  return { success: true, coverPhotoUrl: uploaded.url };
}

export async function removeBarbershopCover(): Promise<CoverUploadResult> {
  const membership = await requireRole("owner");
  const barbershopId = membership.barbershopId;

  const barbershop = await db.barbershop.findFirst({
    where: { id: barbershopId },
    select: { coverPhotoUrl: true, slug: true },
  });
  if (!barbershop) {
    return { success: false, error: "Barbearia não encontrada." };
  }

  if (barbershop.coverPhotoUrl) {
    try { await del(barbershop.coverPhotoUrl); } catch {}
  }

  await db.barbershop.update({
    where: { id: barbershopId },
    data: { coverPhotoUrl: null },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);

  return { success: true, coverPhotoUrl: "" };
}

// ─── FOTO DE PERFIL / LOGO DA BARBEARIA ───────────────────────────────────────
// Espelha 1:1 o padrão da capa (uploadBarbershopCover): RBAC owner,
// barbershopId do membership, uploadImageToBlob reusado, del() da imagem antiga
// só depois do upload novo confirmado, revalidação da página pública + Settings.
// A compressão acontece no CLIENTE (compressImageFile, maxSide 800 — imagem
// pequena/quadrada, não precisa de 1600 como a capa).

export type LogoUploadResult =
  | { success: true; logoUrl: string }
  | { success: false; error: string };

const ALLOWED_LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_LOGO_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadBarbershopLogo(
  formData: FormData,
): Promise<LogoUploadResult> {
  const membership = await requireRole("owner");
  const barbershopId = membership.barbershopId;

  const barbershop = await db.barbershop.findFirst({
    where: { id: barbershopId },
    select: { logoUrl: true, slug: true },
  });
  if (!barbershop) {
    return { success: false, error: "Barbearia não encontrada." };
  }

  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return { success: false, error: "Arquivo inválido." };
  }

  const uploaded = await uploadImageToBlob({
    file,
    pathPrefix: `barbershops/${barbershopId}/logo`,
    maxBytes: MAX_LOGO_BYTES,
    allowedTypes: ALLOWED_LOGO_TYPES,
  });
  if ("error" in uploaded) {
    return { success: false, error: uploaded.error };
  }

  // Remove o logo antigo só depois do upload novo ter sido confirmado.
  if (barbershop.logoUrl) {
    try { await del(barbershop.logoUrl); } catch {}
  }

  await db.barbershop.update({
    where: { id: barbershopId },
    data: { logoUrl: uploaded.url },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);

  return { success: true, logoUrl: uploaded.url };
}

export async function removeBarbershopLogo(): Promise<LogoUploadResult> {
  const membership = await requireRole("owner");
  const barbershopId = membership.barbershopId;

  const barbershop = await db.barbershop.findFirst({
    where: { id: barbershopId },
    select: { logoUrl: true, slug: true },
  });
  if (!barbershop) {
    return { success: false, error: "Barbearia não encontrada." };
  }

  if (barbershop.logoUrl) {
    try { await del(barbershop.logoUrl); } catch {}
  }

  await db.barbershop.update({
    where: { id: barbershopId },
    data: { logoUrl: null },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/${barbershop.slug}`);

  return { success: true, logoUrl: "" };
}
