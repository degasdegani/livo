// Constantes e helpers puros compartilhados entre DayView e WeekView.
// Sem React, sem imports de UI — só lógica de data e configuração visual.

export const PX_PER_MINUTE = 2;
export const RULER_WIDTH = 56; // px
export const MIN_COL_WIDTH = 160; // px

export const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/40",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
  },
  confirmed: {
    label: "Confirmado",
    bg: "bg-green-500/15",
    border: "border-green-500/40",
    dot: "bg-green-500",
    text: "text-green-400",
  },
  completed: {
    label: "Concluído",
    bg: "bg-zinc-600/20",
    border: "border-zinc-600/40",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
    text: "text-red-400",
  },
  no_show: {
    label: "Não compareceu",
    bg: "bg-zinc-700/20",
    border: "border-zinc-700/40",
    dot: "bg-zinc-600",
    text: "text-zinc-500",
  },
} as const;

/** "HH:MM" → minutes since midnight. */
export function timeStrToMin(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/** minutes since midnight → "HH:MM". */
export function minToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ISO UTC → "HH:MM" em BRT (UTC-3, sem horário de verão desde 2019). */
export function isoToTimeBRT(isoStr: string): string {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** ISO UTC → "YYYY-MM-DD" em BRT. */
export function isoToDateKeyBRT(isoStr: string): string {
  const utcMs = new Date(isoStr).getTime();
  const brtMs = utcMs - 3 * 60 * 60 * 1_000;
  const d = new Date(brtMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** dateKey + "HH:MM" BRT → ISO UTC string. */
export function dateTimeToISO(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00-03:00`).toISOString();
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function isTodayKey(dateKey: string): boolean {
  return dateKey === formatDateKey(new Date());
}
