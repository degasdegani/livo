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
