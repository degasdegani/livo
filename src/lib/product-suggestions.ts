"use server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireMembership } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendProductSuggestionEmail } from "@/lib/email";
import { buildWhatsappUrl, sanitizePhone } from "@/lib/whatsapp";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hora

export type SubmitSuggestionResult =
  | { success: true; whatsappUrl: string | null }
  | { success: false; error: string };

export async function submitProductSuggestion(
  message: string,
): Promise<SubmitSuggestionResult> {
  const membership = await requireMembership();

  const trimmed = message.trim();
  if (trimmed.length < MIN_LENGTH) {
    return { success: false, error: "Escreva uma mensagem um pouco mais detalhada." };
  }
  if (trimmed.length > MAX_LENGTH) {
    return { success: false, error: "Mensagem muito longa. Tente resumir um pouco." };
  }

  const rate = await checkRateLimit(
    `product-suggestion:${membership.membershipId}`,
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!rate.success) {
    return {
      success: false,
      error: "Você enviou várias sugestões recentemente. Tente novamente mais tarde.",
    };
  }

  try {
    await db.productSuggestion.create({
      data: {
        barbershopId: membership.barbershopId,
        membershipId: membership.membershipId,
        role: membership.role,
        message: trimmed,
      },
    });
  } catch (error) {
    log.error("falha ao salvar sugestao de produto", { barbershopId: membership.barbershopId, error });
    return { success: false, error: "Não foi possível enviar sua sugestão agora. Tente novamente." };
  }

  let barbershopName = "Barbearia desconhecida";
  try {
    const barbershop = await db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      select: { name: true },
    });
    barbershopName = barbershop?.name ?? barbershopName;
  } catch (error) {
    log.warn("falha ao buscar nome da barbearia para notificacao (nao bloqueante)", { barbershopId: membership.barbershopId, error });
  }

  try {
    await sendProductSuggestionEmail({
      barbershopId: membership.barbershopId,
      barbershopName,
      role: membership.role,
      message: trimmed,
    });
  } catch (error) {
    log.warn("falha ao notificar founder por e-mail sobre sugestao (nao bloqueante)", { barbershopId: membership.barbershopId, error });
  }

  let whatsappUrl: string | null = null;
  const founderPhone = sanitizePhone(process.env.FOUNDER_WHATSAPP_NUMBER);
  if (founderPhone) {
    const text = `Nova sugestao — ${barbershopName} (${membership.role}):\n\n${trimmed}`;
    whatsappUrl = buildWhatsappUrl(founderPhone, text);
  }

  return { success: true, whatsappUrl };
}
