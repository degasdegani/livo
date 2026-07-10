/**
 * Environment variable validation for LIVO.
 *
 * Runs at server startup via src/instrumentation.ts.
 * In production: throws on missing CRITICAL vars (app is non-functional without them).
 * In development: warns so developers see missing vars without crashing.
 *
 * Do NOT import this file on the client side.
 */

type EnvVar = {
  key: string;
  description: string;
  critical: boolean; // throws in production when missing
};

const SERVER_ENV_VARS: EnvVar[] = [
  // Authentication
  { key: "AUTH_SECRET", description: "NextAuth v5 JWT signing secret (32+ random chars)", critical: true },
  { key: "GOOGLE_CLIENT_ID", description: "Google OAuth 2.0 Client ID", critical: true },
  { key: "GOOGLE_CLIENT_SECRET", description: "Google OAuth 2.0 Client Secret", critical: true },

  // Database
  { key: "DATABASE_URL", description: "PostgreSQL connection string (Neon)", critical: true },

  // Email
  { key: "RESEND_API_KEY", description: "Resend transactional email API key", critical: true },
  { key: "FOUNDER_NOTIFICATION_EMAIL", description: "E-mail do founder para notificacoes internas (sugestoes de produto, etc)", critical: false },

  // Payments
  { key: "ASAAS_KEY", description: "Asaas payment gateway API key", critical: true },
  { key: "ASAAS_WEBHOOK_TOKEN", description: "Asaas webhook authentication token", critical: true },
  { key: "ASAAS_CLUBE_WEBHOOK_TOKEN", description: "Token de autenticação do webhook do Clube de Assinatura", critical: true },
  { key: "ASAAS_WEBHOOK_EMAIL", description: "Email usado na configuração do webhook Asaas", critical: false },
  { key: "NEXT_PUBLIC_ASAAS_SANDBOX", description: "Flag de ambiente sandbox/produção da Asaas", critical: false },

  // AI
  { key: "ANTHROPIC_API_KEY", description: "Anthropic (Claude) API key for Lívia", critical: true },

  // Observability (non-critical — app works without them)
  { key: "SENTRY_DSN", description: "Sentry server-side DSN (error tracking)", critical: false },
  { key: "NEXT_PUBLIC_SENTRY_DSN", description: "Sentry client-side DSN (error tracking)", critical: false },

  // Product analytics (non-critical — app works without them)
  { key: "POSTHOG_API_KEY", description: "PostHog project API key (product analytics)", critical: false },
  { key: "POSTHOG_HOST", description: "PostHog ingestion host (e.g. https://app.posthog.com)", critical: false },

  // Rate limiting (non-critical — fail-open by design, see src/lib/rate-limit.ts)
  { key: "UPSTASH_REDIS_REST_URL", description: "Upstash Redis REST URL (rate limiting)", critical: false },
  { key: "UPSTASH_REDIS_REST_TOKEN", description: "Upstash Redis REST token (rate limiting)", critical: false },
];

export type EnvValidationResult = {
  valid: boolean;
  missing: { key: string; description: string; critical: boolean }[];
  warnings: string[];
};

export function validateEnv(): EnvValidationResult {
  const missing: EnvVar[] = [];
  const warnings: string[] = [];

  for (const envVar of SERVER_ENV_VARS) {
    if (!process.env[envVar.key]) {
      missing.push(envVar);
    }
  }

  const criticalMissing = missing.filter((e) => e.critical);
  const nonCriticalMissing = missing.filter((e) => !e.critical);

  if (nonCriticalMissing.length > 0) {
    warnings.push(
      `[ENV] Optional variables not set: ${nonCriticalMissing.map((e) => e.key).join(", ")}`,
    );
  }

  const result: EnvValidationResult = {
    valid: criticalMissing.length === 0,
    missing,
    warnings,
  };

  // Always log warnings
  for (const w of warnings) {
    // biome-ignore lint/suspicious/noConsole: startup validation
    console.warn(w);
  }

  if (criticalMissing.length > 0) {
    const msg =
      `[ENV] CRITICAL: Missing required environment variables:\n` +
      criticalMissing.map((e) => `  • ${e.key} — ${e.description}`).join("\n");

    if (process.env.NODE_ENV === "production") {
      // biome-ignore lint/suspicious/noConsole: startup validation
      console.error(msg);
      throw new Error(
        `Missing critical environment variables: ${criticalMissing.map((e) => e.key).join(", ")}`,
      );
    } else {
      // biome-ignore lint/suspicious/noConsole: startup validation
      console.warn(msg);
    }
  }

  return result;
}
