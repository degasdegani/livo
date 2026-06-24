// src/lib/whatsapp.ts
// Helpers para montar links wa.me e mensagens de WhatsApp do LIVO.
// Funções puras — sem "use server", sem dependências externas.
//
// IMPORTANTE: os emojis são escritos como escapes Unicode (\u{...}) DE PROPÓSITO.
// Isso mantém os emojis como ASCII no arquivo e impede a corrupção de encoding
// (os "") que ocorre ao gravar caracteres de 4 bytes em ambiente Windows.
// O JavaScript reconstrói o emoji correto em runtime.

export type WhatsappMessageData = {
  clientName: string;
  barbershopName: string;
  professionalName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
};

// Emojis como code points: ASCII no arquivo, emoji real em runtime.
const EMOJI = {
  wave: "\u{1F44B}",
  check: "\u{2705}",
  calendar: "\u{1F4C5}",
  clock: "\u{23F0}",
  barber: "\u{1F488}",
  scissors: "\u{2702}\u{FE0F}",
  smile: "\u{1F60A}",
  wink: "\u{1F609}",
  pray: "\u{1F64F}",
} as const;

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
    `Olá, ${d.clientName}! ${EMOJI.wave}`,
    ``,
    `Seu agendamento na *${d.barbershopName}* está confirmado. ${EMOJI.check}`,
    ``,
    `${EMOJI.calendar} *Data:* ${d.dateLabel}`,
    `${EMOJI.clock} *Horário:* ${d.timeLabel}`,
    `${EMOJI.barber} *Profissional:* ${d.professionalName}`,
    `${EMOJI.scissors} *Serviço:* ${d.serviceName}`,
    ``,
    `Qualquer imprevisto, é só nos avisar por aqui. Te esperamos! ${EMOJI.smile}`,
  ].join("\n");
}

export function reminderMessage(d: WhatsappMessageData): string {
  return [
    `Olá, ${d.clientName}! ${EMOJI.wave}`,
    ``,
    `Passando para lembrar do seu horário hoje na *${d.barbershopName}*. ${EMOJI.wink}`,
    ``,
    `${EMOJI.clock} *Horário:* ${d.timeLabel}`,
    `${EMOJI.barber} *Profissional:* ${d.professionalName}`,
    `${EMOJI.scissors} *Serviço:* ${d.serviceName}`,
    ``,
    `Estamos te esperando! Caso não consiga vir, avise a gente por aqui. ${EMOJI.pray}`,
  ].join("\n");
}

export function noShowMessage(d: WhatsappMessageData): string {
  return [
    `Olá, ${d.clientName}!`,
    ``,
    `Sentimos sua falta hoje na *${d.barbershopName}*. ${EMOJI.barber}`,
    ``,
    `Sabemos que imprevistos acontecem. ${EMOJI.smile} Quando quiser, é só chamar por aqui que encontramos um novo horário pra você.`,
    ``,
    `Será um prazer te atender! ${EMOJI.scissors}`,
  ].join("\n");
}
