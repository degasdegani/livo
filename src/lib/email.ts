import { Resend } from "resend";

import { log } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "noreply@livobarber.com.br";
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://livobarber.com.br";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface AppointmentConfirmationData {
  clientEmail: string;
  clientName: string;
  barbershopName: string;
  barbershopSlug: string;
  serviceName: string;
  servicePrice: number;
  date: string;
  time: string;
  professional: string;
}

export type InvitationEmailPayload = {
  to: string;
  barbershopName: string;
  inviterName: string;
  role: "reception" | "barber";
  token: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatDatePT(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

const ROLE_LABELS: Record<"reception" | "barber", string> = {
  reception: "Recepção",
  barber: "Barbeiro Colaborador",
};

// ─── Confirmação de agendamento ────────────────────────────────────────────────

export async function sendAppointmentConfirmation(
  data: AppointmentConfirmationData,
): Promise<void> {
  if (!data.clientEmail) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: data.clientEmail,
      subject: `✅ Agendamento confirmado — ${data.barbershopName}`,
      html: buildConfirmationHTML(data),
    });
    log.email.info("confirmação de agendamento enviada", {
      to: data.clientEmail,
      barbershopName: data.barbershopName,
    });
  } catch (err) {
    log.email.error("falha ao enviar confirmação de agendamento", {
      to: data.clientEmail,
      barbershopName: data.barbershopName,
    }, err);
  }
}

// ─── Boas-vindas ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  if (!to) return;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Bem-vindo ao LIVO! 🎉",
      html: buildWelcomeHtml(name),
    });
    log.email.info("e-mail de boas-vindas enviado", { to });
  } catch (err) {
    log.email.error("falha ao enviar e-mail de boas-vindas", { to }, err);
  }
}

// ─── Confirmação de e-mail ──────────────────────────────────────────────────────

export async function sendEmailVerification(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  if (!to) return;
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Confirme seu e-mail — LIVO",
      html: buildEmailVerificationHtml(name, verifyUrl),
    });
    log.email.info("e-mail de confirmação enviado", { to });
  } catch (err) {
    log.email.error("falha ao enviar e-mail de confirmação", { to }, err);
  }
}

// ─── E-mail de convite ─────────────────────────────────────────────────────────

export async function sendInvitationEmail(payload: InvitationEmailPayload) {
  const { to, barbershopName, inviterName, role, token } = payload;
  const inviteUrl = `${BASE_URL}/convite/${token}`;
  const roleLabel = ROLE_LABELS[role];

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Você foi convidado para a ${barbershopName} no LIVO`,
      html: buildInvitationHtml({
        barbershopName,
        inviterName,
        roleLabel,
        inviteUrl,
      }),
    });
    log.email.info("e-mail de convite enviado", { to, barbershopName, role });
  } catch (err) {
    log.email.error("falha ao enviar e-mail de convite", { to, barbershopName }, err);
    throw new Error("Falha ao enviar o e-mail de convite. Tente novamente.");
  }
}

// ─── Templates HTML ───────────────────────────────────────────────────────────

function buildConfirmationHTML(data: AppointmentConfirmationData): string {
  const dateFormatted = formatDatePT(data.date);
  const priceFormatted = `R$ ${(data.servicePrice / 100).toFixed(2).replace(".", ",")}`;
  const bookingUrl = `${BASE_URL}/${data.barbershopSlug}`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#17171C;border-radius:12px;border:1px solid #2A2A33;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#C8102E;padding:8px 32px;text-align:center;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">LIVO</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">✅ Agendamento confirmado!</h1>
            <p style="color:#9A9AA6;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Olá, <strong style="color:#fff;">${data.clientName}</strong>! Seu agendamento na
              <strong style="color:#fff;">${data.barbershopName}</strong> está confirmado.
            </p>
            <div style="background:#1F1F27;border:1px solid #2A2A33;border-radius:8px;overflow:hidden;margin:0 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #2A2A33;">
                    <p style="color:#6E6E78;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Serviço</p>
                    <p style="color:#fff;font-size:15px;font-weight:700;margin:0;">${data.serviceName}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #2A2A33;text-align:right;">
                    <p style="color:#6E6E78;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Valor</p>
                    <p style="color:#C8102E;font-size:15px;font-weight:700;margin:0;">${priceFormatted}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #2A2A33;">
                    <p style="color:#6E6E78;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Data</p>
                    <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">${dateFormatted}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #2A2A33;text-align:right;">
                    <p style="color:#6E6E78;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Horário</p>
                    <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">${data.time}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:16px 20px;">
                    <p style="color:#6E6E78;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Profissional</p>
                    <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">${data.professional}</p>
                  </td>
                </tr>
              </table>
            </div>
            <a href="${bookingUrl}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">
              Ver página da barbearia →
            </a>
            <p style="color:#6E6E78;font-size:12px;margin:20px 0 0;line-height:1.6;">
              Para cancelar ou remarcar, entre em contato diretamente com a barbearia.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2A2A33;">
            <p style="color:#6E6E78;font-size:12px;margin:0;">© 2026 LIVO · livobarber.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildWelcomeHtml(name: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#17171C;border-radius:12px;border:1px solid #2A2A33;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#C8102E;padding:8px 32px;text-align:center;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">LIVO</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="color:#fff;font-size:24px;margin:0 0 16px;">Bem-vindo, ${name}! 🎉</h1>
            <p style="color:#9A9AA6;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Falta só um passo: complete a configuração da sua barbearia para começar a receber agendamentos.
            </p>
            <a href="${BASE_URL}/login" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">
              Acessar o LIVO →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2A2A33;">
            <p style="color:#6E6E78;font-size:12px;margin:0;">© 2026 LIVO · livobarber.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildEmailVerificationHtml(name: string, verifyUrl: string): string {
  const greeting = name ? `, ${name}` : "";
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#17171C;border-radius:12px;border:1px solid #2A2A33;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#C8102E;padding:8px 32px;text-align:center;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">LIVO</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">Confirme seu e-mail</h1>
            <p style="color:#9A9AA6;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Olá${greeting}! Para proteger sua conta no LIVO, confirme que este e-mail
              é seu. Clique no botão abaixo.
            </p>
            <a href="${verifyUrl}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">
              Confirmar meu e-mail
            </a>
            <p style="color:#6E6E78;font-size:13px;margin:24px 0 0;line-height:1.6;">
              Este link é válido por <strong style="color:#9A9AA6;">24 horas</strong>.<br>
              Se você não criou uma conta no LIVO, ignore este e-mail.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2A2A33;">
            <p style="color:#6E6E78;font-size:12px;margin:0;">© 2026 LIVO · livobarber.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildInvitationHtml(params: {
  barbershopName: string;
  inviterName: string;
  roleLabel: string;
  inviteUrl: string;
}): string {
  const { barbershopName, inviterName, roleLabel, inviteUrl } = params;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0B0D;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#17171C;border-radius:12px;border:1px solid #2A2A33;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#C8102E;padding:8px 32px;text-align:center;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">LIVO</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">Você foi convidado! ✂️</h1>
            <p style="color:#9A9AA6;font-size:15px;line-height:1.6;margin:0 0 24px;">
              <strong style="color:#fff;">${inviterName}</strong> convidou você para acessar a
              <strong style="color:#fff;">${barbershopName}</strong> no LIVO
              como <strong style="color:#C8A24C;">${roleLabel}</strong>.
            </p>
            <div style="background:#1F1F27;border:1px solid #2A2A33;border-radius:8px;padding:20px;margin:0 0 28px;">
              <p style="color:#9A9AA6;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Barbearia</p>
              <p style="color:#fff;font-size:17px;font-weight:700;margin:0 0 16px;">${barbershopName}</p>
              <p style="color:#9A9AA6;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Seu papel</p>
              <p style="color:#C8A24C;font-size:15px;font-weight:600;margin:0;">${roleLabel}</p>
            </div>
            <a href="${inviteUrl}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:700;font-size:16px;">
              Aceitar convite →
            </a>
            <p style="color:#6E6E78;font-size:12px;margin:24px 0 0;">
              Este link expira em <strong style="color:#9A9AA6;">7 dias</strong>.
              Se você não reconhece este convite, ignore este e-mail.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2A2A33;">
            <p style="color:#6E6E78;font-size:12px;margin:0;">© 2026 LIVO · livobarber.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
