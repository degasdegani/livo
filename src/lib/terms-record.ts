import { headers } from "next/headers";
import { db } from "@/lib/db";
import { CURRENT_TERMS_VERSION, TERMS_DOCUMENT_TYPE } from "@/lib/terms";

// Grava um evento de aceite (append-only — nunca update/delete). Captura IP e
// user-agent do request via headers() do Next. Node-only (Prisma + headers) —
// deve ser chamada de Server Action / Server Component, nunca de Edge/client.
// Reusada pelo cadastro por credenciais e pelo interstitial /aceitar-termos.
export async function recordTermsAcceptance(
  userId: string,
  documentType: string = TERMS_DOCUMENT_TYPE,
  version: string = CURRENT_TERMS_VERSION,
): Promise<void> {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent") ?? null;

  await db.termsAcceptance.create({
    data: { userId, documentType, version, ipAddress, userAgent },
  });
}
