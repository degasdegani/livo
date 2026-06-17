"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { getAgendaMonthSummary } from "./agenda-actions";
import { isoToDateKeyBRT } from "./components/shared";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MonthViewProps {
  initialCountByDay: Record<string, number>;
  initialYear: number;
  initialMonth: number; // 0-indexed (0 = Janeiro)
}

// ══════════════════════════════════════════════════════════════════════════════
// MonthView
// ══════════════════════════════════════════════════════════════════════════════

export default function MonthView({
  initialCountByDay,
  initialYear,
  initialMonth,
}: MonthViewProps) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [countByDay, setCountByDay] = useState(initialCountByDay);
  const [isPending, startTransition] = useTransition();

  // Computed once on mount — BRT today regardless of browser timezone.
  const todayKey = useMemo(() => isoToDateKeyBRT(new Date().toISOString()), []);

  // ── Month navigation ─────────────────────────────────────────────────────

  async function loadMonth(y: number, m: number) {
    const monthStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const data = await getAgendaMonthSummary(monthStart);
    setCountByDay(data.countByDay);
  }

  function navigate(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 0) { y -= 1; m = 11; }
    if (m > 11) { y += 1; m = 0; }
    setYear(y);
    setMonth(m);
    startTransition(async () => { await loadMonth(y, m); });
  }

  function goToday() {
    const today = isoToDateKeyBRT(new Date().toISOString());
    const [todayYearStr, todayMonthStr] = today.split("-");
    const y = Number(todayYearStr);
    const m = Number(todayMonthStr) - 1; // 0-indexed
    setYear(y);
    setMonth(m);
    startTransition(async () => { await loadMonth(y, m); });
  }

  // ── Day navigation (to Visão Dia) ────────────────────────────────────────

  function navigateToDay(dateKey: string) {
    router.push(`/dashboard/agenda?view=operacional&date=${dateKey}`);
  }

  // ── Grid computation ─────────────────────────────────────────────────────

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();    // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) result.push(null);  // leading blanks
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);      // trailing blanks
    return result;
  }, [year, month]);

  const totalRows = cells.length / 7;

  const isCurrentMonth = (() => {
    const [tkYear, tkMonth] = todayKey.split("-").map(Number);
    return tkYear === year && tkMonth - 1 === month;
  })();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* ── Header: navegação de mês ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {MONTHS[month]} de {year}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isPending}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            aria-label="Mês anterior"
          >
            ◀
          </button>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              disabled={isPending}
              className="px-3 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            >
              Hoje
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(1)}
            disabled={isPending}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            aria-label="Próximo mês"
          >
            ▶
          </button>
        </div>
      </div>

      {/* ── Cabeçalho dos dias da semana ────────────────────────────────── */}
      <div
        className="grid grid-cols-7"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-3 text-center text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* ── Grid de dias ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const borderRight = col < 6 ? "1px solid var(--border)" : "none";
          const borderBottom = row < totalRows - 1 ? "1px solid var(--border)" : "none";

          // Empty padding cell (days outside this month)
          if (d === null) {
            return (
              <div
                key={`blank-${i}`}
                className="min-h-[80px]"
                style={{
                  borderRight,
                  borderBottom,
                  backgroundColor: "var(--bg-base)",
                  opacity: 0.4,
                }}
              />
            );
          }

          // Real day cell
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const count = countByDay[dateKey] ?? 0;
          const isToday = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => navigateToDay(dateKey)}
              className="min-h-[80px] p-2 flex flex-col gap-1 text-left transition-colors"
              style={{ borderRight, borderBottom, outline: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              aria-label={`${d} de ${MONTHS[month]}, ${count} agendamento${count !== 1 ? "s" : ""}`}
            >
              {/* Número do dia */}
              <span
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm"
                style={{
                  backgroundColor: isToday ? "var(--color-primary)" : undefined,
                  color: isToday ? "#fff" : "var(--text-primary)",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {d}
              </span>

              {/* Indicador de agendamentos */}
              {count > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {count}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading indicator durante navegação de mês */}
      {isPending && (
        <div
          className="text-center py-2 text-xs"
          style={{
            color: "var(--text-tertiary)",
            borderTop: "1px solid var(--border)",
          }}
        >
          Carregando…
        </div>
      )}
    </div>
  );
}
