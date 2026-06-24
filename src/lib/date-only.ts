// src/lib/date-only.ts
// Utilitários para campos date-only (ex: data de nascimento) que NÃO podem sofrer
// shift de fuso horário. Convenção: gravar em meia-noite UTC; ler/exibir SEMPRE em UTC.

/** "YYYY-MM-DD" (vindo do <input type="date">) -> Date em meia-noite UTC. */
export function dateOnlyToUTC(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date/ISO (meia-noite UTC) -> "YYYY-MM-DD" para popular <input type="date">. */
export function dateOnlyToInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Formata um date-only em pt-BR usando UTC (sem shift de fuso). */
export function formatDateOnly(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(d);
}
