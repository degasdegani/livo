import crypto from "node:crypto";

// Util comum de hashing de tokens de uso único (reset de senha, confirmação de
// e-mail). O token cru trafega apenas na URL/e-mail; no banco guardamos somente
// o hash SHA-256. Node-only (usa node:crypto) — nunca importar em Edge.

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
