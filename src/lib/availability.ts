// ============================================================
// LIVO — Lógica de Disponibilidade de Horários
// Calcula slots disponíveis considerando:
//   - Horário de funcionamento da barbearia
//   - Duração do serviço
//   - Agendamentos já existentes
//   - Hora atual (bloqueia slots no passado)
// ============================================================

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

interface GenerateSlotsParams {
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  serviceDuration: number; // em minutos (ex: 30, 45, 60)
  appointments: ExistingAppointment[];
  isToday: boolean; // se for hoje, bloqueia slots passados
  currentMinutes: number; // hora atual em minutos (só usado se isToday)
}

// Função principal: gera todos os slots disponíveis
export function generateAvailableSlots({
  openTime,
  closeTime,
  serviceDuration,
  appointments,
  isToday,
  currentMinutes,
}: GenerateSlotsParams): string[] {
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);

  // Intervalo base entre slots: 30 minutos
  // Ex: 09:00, 09:30, 10:00, ...
  const SLOT_INTERVAL = 30;

  const availableSlots: string[] = [];

  // Gera slots do horário de abertura até o horário em que
  // o último atendimento ainda caberia antes do fechamento
  for (
    let slotStart = openMin;
    slotStart + serviceDuration <= closeMin;
    slotStart += SLOT_INTERVAL
  ) {
    const slotEnd = slotStart + serviceDuration;

    // ── Verifica conflito com agendamentos existentes ──────
    // Um slot está ocupado se houver qualquer agendamento que:
    // - começa antes do fim do slot
    // - termina depois do início do slot
    // (lógica de sobreposição de intervalos)
    const hasConflict = appointments.some(
      (appt) => slotStart < appt.endMinutes && slotEnd > appt.startMinutes,
    );

    // ── Verifica se está no passado ────────────────────────
    // Adiciona 30 min de buffer para não mostrar slots muito próximos
    const isPast = isToday && slotStart <= currentMinutes + 30;

    if (!hasConflict && !isPast) {
      availableSlots.push(minutesToTime(slotStart));
    }
  }

  return availableSlots;
}
