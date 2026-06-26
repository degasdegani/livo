import crypto from "crypto";

// ---------------------------------------------------------------------------
// Rate limit in-memory (mesmo padrão do login/Lívia)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

export function checkOtpRateLimit(
  barbershopId: string,
  phone: string
): { allowed: boolean; retryAfterMs?: number } {
  const key = `${barbershopId}:${phone}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
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
