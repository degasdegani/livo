"use server";

import { Resend } from "resend";
import { db } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "noreply@livobarber.com.br";
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://livobarber.com.br";

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

export async function requestPasswordReset(
  email: string,
): Promise<{ success?: boolean; error?: string }> {
  if (!email || !email.includes("@")) {
    return { error: "E-mail inválido." };
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { success: allowed } = await checkRateLimit(
    `forgot-password:${normalizedEmail}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!allowed) {
    return { error: "Muitas tentativas. Tente novamente em 15 minutos." };
  }

  try {
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || user.password === null) {
      return { success: true };
    }

    const token = await createPasswordResetToken(normalizedEmail);
    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: FROM,
      to: normalizedEmail,
      subject: "Redefinição de senha — LIVO",
      html: buildPasswordResetHtml(resetUrl),
    });

    return { success: true };
  } catch {
    return { error: "Erro ao processar. Tente novamente." };
  }
}

function buildPasswordResetHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
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
            <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">Redefinição de senha</h1>
            <p style="color:#9A9AA6;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Recebemos uma solicitação para redefinir a senha da sua conta no LIVO.
              Clique no botão abaixo para criar uma nova senha.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;">
              Redefinir minha senha
            </a>
            <p style="color:#6E6E78;font-size:13px;margin:24px 0 0;line-height:1.6;">
              Este link é válido por <strong style="color:#9A9AA6;">1 hora</strong>.<br>
              Se você não solicitou a redefinição de senha, ignore este e-mail.
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
