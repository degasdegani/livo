import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "LIVO <noreply@livobarber.com.br>";
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://livobarber.com.br";

// ─── E-mail de boas-vindas (já existia) ───────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Bem-vindo ao LIVO! 🎉",
      html: buildWelcomeHtml(name),
    });
  } catch (err) {
    // Falha no e-mail não deve bloquear o fluxo principal
    console.error("[email] sendWelcomeEmail falhou:", err);
  }
}

// ─── E-mail de convite (novo — Dia 2) ─────────────────────────────────────────
export type InvitationEmailPayload = {
  to: string;
  barbershopName: string;
  inviterName: string;
  role: "reception" | "barber";
  token: string;
};

const ROLE_LABELS: Record<InvitationEmailPayload["role"], string> = {
  reception: "Recepção",
  barber: "Barbeiro Colaborador",
};

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
  } catch (err) {
    console.error("[email] sendInvitationEmail falhou:", err);
    // Re-throw aqui porque o dono precisa saber se o e-mail não saiu
    throw new Error("Falha ao enviar o e-mail de convite. Tente novamente.");
  }
}

// ─── Templates HTML ───────────────────────────────────────────────────────────

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
              Sua barbearia está configurada e pronta para decolar. Acesse o painel e comece a usar o sistema operacional da barbearia moderna.
            </p>
            <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">
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
</html>`;
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
            <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">
              Você foi convidado! ✂️
            </h1>
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
</html>`;
}
