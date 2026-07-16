// Sistema de Avaliações (LIVO-063) — geração e envio de convite de avaliação.
//
// SERVER-ONLY: toca o banco (Prisma) e dispara e-mail. Mesmo padrão de
// src/lib/referral-server.ts: módulo isolado atrás de "server-only" para
// nunca vazar Prisma/Resend no bundle do client.
import "server-only";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { generateRawToken, hashToken } from "@/lib/token-hash";
import { sendReviewInviteEmail } from "@/lib/email";

export type ReviewInviteValidation =
  | {
      success: true;
      appointmentId: string;
      professionalName: string;
      barbershopName: string;
      clientName: string;
    }
  | { success: false; reason: "invalid" | "expired" | "used" };

export type SubmitReviewResult =
  | { success: true }
  | { success: false; reason: "invalid" | "expired" | "used" | "invalid_rating" };

const REVIEW_INVITE_EXPIRATION_DAYS = 30;

interface CreateReviewInviteParams {
  appointmentId: string;
}

// Gera (de forma idempotente) o convite de avaliação de um agendamento e,
// se o cliente tiver e-mail cadastrado, dispara o e-mail automaticamente.
// Sempre retorna a URL do convite — mesmo sem e-mail, para uso em
// compartilhamento manual (copiar link / WhatsApp) na UI do painel.
// Fail-open: nunca lança erro — chamado de dentro do fechamento de comanda,
// que não pode falhar por causa disso (mesmo princípio de sendAppointmentConfirmation).
export async function createReviewInviteAndNotify(
  params: CreateReviewInviteParams,
): Promise<{ url: string } | null> {
  const { appointmentId } = params;

  try {
    const existing = await db.reviewInvite.findUnique({
      where: { appointmentId },
    });

    let rawToken: string;

    if (existing) {
      // Já existe convite (ex: comanda reaberta e fechada de novo) — reaproveita,
      // não gera um segundo token para o mesmo agendamento.
      rawToken = existing.tokenHash; // placeholder abaixo é substituído logo adiante
    } else {
      rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(
        Date.now() + REVIEW_INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      );

      await db.reviewInvite.create({
        data: { appointmentId, tokenHash, expiresAt },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://livobarber.com.br";

    if (existing) {
      // Convite já existia: não temos o token cru salvo (só o hash, por design
      // de segurança) — não é possível remontar a URL original neste caminho.
      // Isso é esperado: reabertura de comanda já fechada é caso raro; se
      // precisar reenviar, o fluxo de UI deve oferecer "gerar novo link".
      log.info("convite de avaliação já existia, não reenviado", { appointmentId });
      return null;
    }

    const reviewUrl = `${baseUrl}/avaliar/${rawToken}`;

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: { select: { name: true, email: true } },
        professional: { select: { name: true } },
        barbershop: { select: { name: true } },
      },
    });

    if (!appointment) {
      log.error("appointment não encontrado ao criar convite de avaliação", { appointmentId });
      return { url: reviewUrl };
    }

    if (appointment.client?.email) {
      await sendReviewInviteEmail({
        to: appointment.client.email,
        clientName: appointment.client.name,
        barbershopName: appointment.barbershop.name,
        professionalName: appointment.professional?.name ?? "",
        reviewUrl,
      });
    }

    return { url: reviewUrl };
  } catch (err) {
    log.error("falha ao criar convite de avaliação", { appointmentId }, err);
    return null;
  }
}

export async function validateReviewInviteToken(
  token: string,
): Promise<ReviewInviteValidation> {
  const tokenHash = hashToken(token);
  const invite = await db.reviewInvite.findUnique({
    where: { tokenHash },
    include: {
      appointment: {
        include: {
          client: { select: { name: true } },
          professional: { select: { name: true } },
          barbershop: { select: { name: true } },
        },
      },
    },
  });

  if (!invite) return { success: false, reason: "invalid" };
  if (invite.usedAt !== null) return { success: false, reason: "used" };
  if (invite.expiresAt < new Date()) return { success: false, reason: "expired" };

  return {
    success: true,
    appointmentId: invite.appointmentId,
    professionalName: invite.appointment.professional?.name ?? "",
    barbershopName: invite.appointment.barbershop.name,
    clientName: invite.appointment.client?.name ?? "Cliente",
  };
}

export async function submitReview(
  token: string,
  rating: number,
  comment: string | null,
): Promise<SubmitReviewResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, reason: "invalid_rating" };
  }

  const tokenHash = hashToken(token);
  const invite = await db.reviewInvite.findUnique({
    where: { tokenHash },
    include: {
      appointment: {
        include: {
          client: { select: { name: true } },
          professional: { select: { id: true } },
        },
      },
    },
  });

  if (!invite) return { success: false, reason: "invalid" };
  if (invite.usedAt !== null) return { success: false, reason: "used" };
  if (invite.expiresAt < new Date()) return { success: false, reason: "expired" };

  const professionalId = invite.appointment.professional?.id;
  if (!professionalId) return { success: false, reason: "invalid" };

  try {
    await db.$transaction(async (tx) => {
      // Revalida dentro da transação para evitar duplo consumo concorrente
      // (mesmo padrão de consumeEmailVerificationToken).
      const fresh = await tx.reviewInvite.findUnique({ where: { tokenHash } });
      if (!fresh || fresh.usedAt !== null || fresh.expiresAt < new Date()) {
        throw new Error("Convite inválido ou já utilizado");
      }

      await tx.reviewInvite.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });

      await tx.review.create({
        data: {
          barbershopId: invite.appointment.barbershopId,
          professionalId,
          appointmentId: invite.appointmentId,
          rating,
          comment: comment?.trim() || null,
          clientName: invite.appointment.client?.name ?? "Cliente",
        },
      });

      // Recalcula o cache de agregação (avgRating/reviewCount) — fórmula
      // incremental, sem precisar de AVG()/COUNT() sobre toda a tabela.
      const professional = await tx.professional.findUnique({
        where: { id: professionalId },
        select: { avgRating: true, reviewCount: true },
      });
      const oldCount = professional?.reviewCount ?? 0;
      const oldAvg = professional?.avgRating ? Number(professional.avgRating) : 0;
      const newCount = oldCount + 1;
      const newAvg = (oldAvg * oldCount + rating) / newCount;

      await tx.professional.update({
        where: { id: professionalId },
        data: {
          reviewCount: newCount,
          avgRating: Math.round(newAvg * 10) / 10,
        },
      });
    });

    log.info("avaliação registrada", { appointmentId: invite.appointmentId, rating });
    return { success: true };
  } catch (err) {
    log.error("falha ao registrar avaliação", { appointmentId: invite.appointmentId }, err);
    return { success: false, reason: "invalid" };
  }
}
