// ============================================================
// LIVO — Utilitário de E-mail (Resend)
// Centraliza todos os e-mails transacionais do sistema
// ============================================================

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Tipos ─────────────────────────────────────────────────────
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

interface WelcomeEmailData {
  userEmail: string;
  userName: string;
}

// ── Formatação de data ─────────────────────────────────────────
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

// ── Template: Confirmação de Agendamento ──────────────────────
function buildConfirmationHTML(data: AppointmentConfirmationData): string {
  const dateFormatted = formatDatePT(data.date);
  const priceFormatted = `R$ ${(data.servicePrice / 100).toFixed(2).replace(".", ",")}`;
  const bookingUrl = `https://livobarber.com.br/${data.barbershopSlug}`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agendamento Confirmado — ${data.barbershopName}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:8px;height:8px;border-radius:50%;background:#FF2D55;display:inline-block;vertical-align:middle;"></td>
                  <td style="padding-left:6px;font-size:18px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;vertical-align:middle;">Livo</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FF2D55;padding:20px 32px;text-align:center;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
                      Agendamento Confirmado
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;">
                      Olá, ${data.clientName}! 👋
                    </p>
                    <p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6;">
                      Seu agendamento na <strong style="color:#0A0A0A;">${data.barbershopName}</strong> está confirmado.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F9;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="padding:20px 24px;border-bottom:1px solid #F0F0F0;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:1px;">Serviço</p>
                          <p style="margin:0;font-size:16px;font-weight:700;color:#0A0A0A;">${data.serviceName}</p>
                        </td>
                        <td style="padding:20px 24px;border-bottom:1px solid #F0F0F0;text-align:right;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:1px;">Valor</p>
                          <p style="margin:0;font-size:16px;font-weight:900;color:#FF2D55;">${priceFormatted}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 24px;border-bottom:1px solid #F0F0F0;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:1px;">Data</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#0A0A0A;">${dateFormatted}</p>
                        </td>
                        <td style="padding:20px 24px;border-bottom:1px solid #F0F0F0;text-align:right;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:1px;">Horário</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#0A0A0A;">${data.time}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:20px 24px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:1px;">Profissional</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#0A0A0A;">${data.professional}</p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                      <tr>
                        <td align="center">
                          <a href="${bookingUrl}" style="display:inline-block;background:#FF2D55;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
                            Ver página da barbearia
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;font-size:12px;color:#A1A1AA;text-align:center;line-height:1.6;">
                      Para cancelar ou remarcar, entre em contato diretamente com a barbearia.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A1A1AA;">
                Agendamento realizado pelo
                <a href="https://livobarber.com.br" style="color:#FF2D55;text-decoration:none;font-weight:600;">Livo</a>
                — Gestão inteligente para barbearias
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── Template: Boas-vindas ──────────────────────────────────────
function buildWelcomeHTML(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao Livo</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:8px;height:8px;border-radius:50%;background:#FF2D55;display:inline-block;vertical-align:middle;"></td>
                  <td style="padding-left:6px;font-size:18px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;vertical-align:middle;">Livo</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FF2D55;padding:20px 32px;text-align:center;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
                      Bem-vindo ao Livo 🎉
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;">
                      Olá, ${data.userName}! 👋
                    </p>
                    <p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6;">
                      Sua conta no <strong style="color:#0A0A0A;">Livo</strong> foi criada com sucesso.
                      Configure sua barbearia e comece a receber agendamentos online agora mesmo.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                      <tr>
                        <td align="center">
                          <a href="https://livobarber.com.br/dashboard" style="display:inline-block;background:#FF2D55;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
                            Acessar meu painel
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;font-size:12px;color:#A1A1AA;text-align:center;line-height:1.6;">
                      Qualquer dúvida, estamos aqui para ajudar.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A1A1AA;">
                <a href="https://livobarber.com.br" style="color:#FF2D55;text-decoration:none;font-weight:600;">Livo</a>
                — Gestão inteligente para barbearias
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── Envio: Confirmação de Agendamento ─────────────────────────
export async function sendAppointmentConfirmation(
  data: AppointmentConfirmationData,
): Promise<void> {
  if (!data.clientEmail) return;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "noreply@livobarber.com.br",
      to: data.clientEmail,
      subject: `✅ Agendamento confirmado — ${data.barbershopName}`,
      html: buildConfirmationHTML(data),
    });
    console.log(`[email] Confirmação enviada para ${data.clientEmail}`);
  } catch (err) {
    console.error("[email] Falha ao enviar confirmação:", err);
  }
}

// ── Envio: Boas-vindas ────────────────────────────────────────
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!data.userEmail) return;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "noreply@livobarber.com.br",
      to: data.userEmail,
      subject: "Bem-vindo ao Livo 🎉",
      html: buildWelcomeHTML(data),
    });
    console.log(`[email] Boas-vindas enviado para ${data.userEmail}`);
  } catch (err) {
    console.error("[email] Falha ao enviar boas-vindas:", err);
  }
}
