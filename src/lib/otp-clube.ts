import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Rate limit — Upstash Redis (src/lib/rate-limit.ts)
// ---------------------------------------------------------------------------

const MAX_REQUESTS = 3;
const WINDOW_SECONDS = 60 * 60; // 1 hora

export async function checkOtpRateLimit(
  barbershopId: string,
  phone: string
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const key = `otp-clube:${barbershopId}:${phone}`;
  const { success, reset } = await checkRateLimit(key, MAX_REQUESTS, WINDOW_SECONDS);

  if (!success) {
    return {
      allowed: false,
      retryAfterMs: reset ? Math.max(0, reset - Date.now()) : WINDOW_SECONDS * 1000,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Gerar e hashear código OTP
// ---------------------------------------------------------------------------

export function generateOtpCode(): string {
  // 6 dígitos numéricos
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  return hashOtpCode(code) === hash;
}

// ---------------------------------------------------------------------------
// Envio de SMS (dev = console, prod = provedor)
// ---------------------------------------------------------------------------

export async function sendOtpSms(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP-CLUBE] Telefone: ${phone} | Código: ${code}`);
    return { success: true };
  }

  // TODO: integrar provedor SMS nacional (ex.: Comtele, Zenvia)
  // Substituir este bloco quando o provedor for escolhido
  console.error("[OTP-CLUBE] Provedor SMS não configurado para produção.");
  return { success: false, error: "Serviço de SMS não disponível." };
}
