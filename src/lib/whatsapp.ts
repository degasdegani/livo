// src/lib/whatsapp.ts
// Helpers para montar links wa.me e mensagens de WhatsApp do LIVO.
// Funções puras — sem "use server", sem dependências externas.

export type WhatsappMessageData = {
  clientName: string;
  barbershopName: string;
  professionalName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
};

export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function buildWhatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function confirmationMessage(d: WhatsappMessageData): string {
  return [
    `Olá, ${d.clientName}! 👋`,
    ``,
    `Seu agendamento na *${d.barbershopName}* está confirmado. ✅`,
    ``,
    `🗓️ *Data:* ${d.dateLabel}`,
    `⏰ *Horário:* ${d.timeLabel}`,
    `💈 *Profissional:* ${d.professionalName}`,
    `✂️ *Serviço:* ${d.serviceName}`,
    ``,
    `Qualquer imprevisto, é só nos avisar por aqui. Te esperamos! 😊`,
  ].join("\n");
}

export function reminderMessage(d: WhatsappMessageData): string {
  return [
    `Olá, ${d.clientName}! 👋`,
    ``,
    `Passando para lembrar do seu horário hoje na *${d.barbershopName}*. 😉`,
    ``,
    `⏰ *Horário:* ${d.timeLabel}`,
    `💈 *Profissional:* ${d.professionalName}`,
    `✂️ *Serviço:* ${d.serviceName}`,
    ``,
    `Estamos te esperando! Caso não consiga vir, avise a gente por aqui. 🙏`,
  ].join("\n");
}

export function noShowMessage(d: WhatsappMessageData): string {
  return [
    `Olá, ${d.clientName}!`,
    ``,
    `Sentimos sua falta hoje na *${d.barbershopName}*. 💈`,
    ``,
    `Sabemos que imprevistos acontecem. 😊 Quando quiser, é só chamar por aqui que encontramos um novo horário pra você.`,
    ``,
    `Será um prazer te atender! ✂️`,
  ].join("\n");
}
