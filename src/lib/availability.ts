// ============================================================
// LIVO — Lógica de Disponibilidade de Horários
// Calcula slots do expediente considerando:
//   - Horário de funcionamento da barbearia
//   - Duração total somada dos serviços escolhidos
//   - Agendamentos já existentes (sobreposição de intervalos)
//   - Hora atual (bloqueia slots passados + buffer de 30 min)
// ============================================================
import { SLOT_CONFIG } from "@/lib/slot-config";

// Converte "09:30" em 570 (minutos desde meia-noite)
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Converte 570 em "09:30"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// Tipo de agendamento existente (simplificado)
interface ExistingAppointment {
  startMinutes: number; // minutos desde meia-noite
  endMinutes: number; // minutos desde meia-noite
}

// Slot com status de disponibilidade
export type SlotInfo = { time: string; available: boolean };

interface GenerateSlotsParams {
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  serviceDuration: number; // duração total somada dos serviços selecionados (minutos)
  appointments: ExistingAppointment[];
  isToday: boolean; // se for hoje, bloqueia slots passados
  currentMinutes: number; // hora atual em minutos (só usado se isToday)
}

// Gera TODOS os slots do expediente (openTime → closeTime, step = SLOT_MINUTES).
// Cada slot inclui available: boolean.
// available = false quando: serviço não cabe antes do fechamento, há conflito,
// ou o slot está no passado (isToday + buffer de 30 min).
export function generateAvailableSlots({
  openTime,
  closeTime,
  serviceDuration,
  appointments,
  isToday,
  currentMinutes,
}: GenerateSlotsParams): SlotInfo[] {
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const SLOT_INTERVAL = SLOT_CONFIG.SLOT_MINUTES;
  const slots: SlotInfo[] = [];

  for (let slotStart = openMin; slotStart < closeMin; slotStart += SLOT_INTERVAL) {
    const slotEnd = slotStart + serviceDuration;
    const fitsBeforeClose = slotEnd <= closeMin;
    const isPast = isToday && slotStart <= currentMinutes + 30;
    const hasConflict =
      fitsBeforeClose &&
      appointments.some(
        (appt) => slotStart < appt.endMinutes && slotEnd > appt.startMinutes,
      );
    slots.push({
      time: minutesToTime(slotStart),
      available: fitsBeforeClose && !isPast && !hasConflict,
    });
  }

  return slots;
}
