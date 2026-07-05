// Programa Embaixadores (A4) — captura do código de indicação (?ref=CODIGO).
//
// O código chega na URL no PRIMEIRO ponto de entrada real do fluxo (/register
// para cadastro por e-mail ou Google; /onboarding quando o usuário já logado
// vai direto). Como /register e /onboarding são páginas/fluxos distintos e o
// signIn(redirectTo) descarta querystring, o valor é preservado num cookie de
// curta duração (24h) gravado no client já no /register e relido no /onboarding.
//
// O create (onboarding/actions.ts) lê o valor apenas via formData.get("ref"),
// no mesmo padrão já usado para "plan" — sem tocar em next/headers no server.

export const REFERRAL_COOKIE = "livo_ref";
const REFERRAL_MAX_LEN = 64;
const REFERRAL_TTL_SECONDS = 60 * 60 * 24; // 24h

// Normaliza o valor cru: apenas trim + teto de tamanho. NÃO altera conteúdo
// (case/charset) para preservar a correspondência EXATA com
// barbershop.referralCode (@unique) no findUnique. Pura — server e client.
export function normalizeReferralCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, REFERRAL_MAX_LEN);
  return trimmed.length > 0 ? trimmed : null;
}

// --- Helpers de client (dependem de document/window) ---
// Só são chamados dentro de handlers/effects em componentes "use client".

// Lê ?ref= da URL atual. Retorna null fora do browser.
export function readReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeReferralCode(
    new URLSearchParams(window.location.search).get("ref"),
  );
}

// Grava o cookie de curta duração para sobreviver /register -> /onboarding.
export function persistReferralCookie(code: string): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(code);
  document.cookie = `${REFERRAL_COOKIE}=${value}; path=/; max-age=${REFERRAL_TTL_SECONDS}; samesite=lax`;
}

// Relê o cookie no /onboarding quando o ref não veio na URL.
export function readReferralCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${REFERRAL_COOKIE}=`));
  if (!match) return null;
  return normalizeReferralCode(
    decodeURIComponent(match.slice(REFERRAL_COOKIE.length + 1)),
  );
}
