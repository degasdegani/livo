// Single source of truth for support contact information.
// Set SUPPORT_WHATSAPP_NUMBER in .env (format: 5511999999999 — country + DDD + number).
export const SUPPORT_WHATSAPP_NUMBER =
  process.env.SUPPORT_WHATSAPP_NUMBER ?? "5511999999999";

export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
