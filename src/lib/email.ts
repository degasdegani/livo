// ============================================================
// LIVO — Utilitário de E-mail (Resend)
// Centraliza todos os e-mails transacionais do sistema
// ============================================================

import { Resend } from "resend";

// Inicializa o cliente Resend com a chave da API
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Tipos ─────────────────────────────────────────────────────
interface AppointmentConfirmationData {
  clientEmail: string;
  clientName: string;
  barbershopName: string;
  barbershopSlug: string;
  serviceName: string;
  servicePrice: number; // em centavos
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  professional: string;
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

// ── Template HTML do e-mail de confirmação ────────────────────
// Design profissional em branco com acento vermelho
// Compatível com Gmail, Outlook e Apple Mail
function buildConfirmationHTML(data: AppointmentConfirmationData): string {
  const dateFormatted = formatDatePT(data.date);
  const priceFormatted = `R$ ${(data.servicePrice / 100).toFixed(2).replace(".", ",")}`;
  const bookingUrl = `https://livo-lime.vercel.app/${data.barbershopSlug}`;

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

          <!-- Header: Logo Livo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:8px;height:8px;border-radius:50%;background:#FF2D55;display:inline-block;vertical-align:middle;"></td>
                  <td style="padding-left:6px;font-size:18px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;vertical-align:middle;">
                    Livo
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

              <!-- Faixa vermelha de status -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FF2D55;padding:20px 32px;text-align:center;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
                      Agendamento Confirmado
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Conteúdo -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px;">

                    <!-- Saudação -->
                    <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;">
                      Olá, ${data.clientName}! 👋
                    </p>
                    <p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6;">
                      Seu agendamento na <strong style="color:#0A0A0A;">${data.barbershopName}</strong> está confirmado.
                      Veja os detalhes abaixo.
                    </p>

                    <!-- Detalhes do agendamento -->
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

                    <!-- Botão CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                      <tr>
                        <td align="center">

                            href="${bookingUrl}"
                            style="display:inline-block;background:#FF2D55;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;"
                          >
                            Ver página da barbearia
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Aviso de cancelamento -->
                    <p style="margin:24px 0 0;font-size:12px;color:#A1A1AA;text-align:center;line-height:1.6;">
                      Para cancelar ou remarcar, entre em contato diretamente com a barbearia.
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A1A1AA;">
                Agendamento realizado pelo
                <a href="https://livo-lime.vercel.app" style="color:#FF2D55;text-decoration:none;font-weight:600;">Livo</a>
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

// ── Função principal de envio ──────────────────────────────────
export async function sendAppointmentConfirmation(
  data: AppointmentConfirmationData,
): Promise<void> {
  // Se não tiver e-mail do cliente, não faz nada
  if (!data.clientEmail) return;

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: data.clientEmail,
      subject: `✅ Agendamento confirmado — ${data.barbershopName}`,
      html: buildConfirmationHTML(data),
    });

    console.log(`[email] Confirmação enviada para ${data.clientEmail}`);
  } catch (err) {
    // E-mail falhou mas NÃO deve quebrar o fluxo do agendamento
    // O agendamento já foi salvo no banco — e-mail é apenas notificação
    console.error("[email] Falha ao enviar confirmação:", err);
  }
}
