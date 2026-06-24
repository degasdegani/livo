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
  return (
    `Olá ${d.clientName}! ✂️ Seu agendamento na ${d.barbershopName} está confirmado.\n\n` +
    `📅 ${d.dateLabel} às ${d.timeLabel}\n` +
    `💈 Profissional: ${d.professionalName}\n` +
    `✨ Serviço: ${d.serviceName}\n\n` +
    `Te esperamos!`
  );
}

export function reminderMessage(d: WhatsappMessageData): string {
  return (
    `Olá ${d.clientName}! 👋 Passando para lembrar do seu horário hoje às ${d.timeLabel} ` +
    `na ${d.barbershopName}, com ${d.professionalName}.\n\n` +
    `Te esperamos em breve! ✂️`
  );
}

export function noShowMessage(d: WhatsappMessageData): string {
  return (
    `Olá ${d.clientName}, sentimos sua falta hoje às ${d.timeLabel} na ${d.barbershopName}. 😕\n\n` +
    `Quando quiser remarcar, é só chamar a gente por aqui!`
  );
}
