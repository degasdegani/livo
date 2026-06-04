// src/components/monthly-calendar.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DayCalendar } from "./day-calendar";
import { DayPanel, type AppointmentForCalendar } from "./day-panel";
import { WeeklyCalendar } from "./weekly-calendar";

type Props = {
  initialYear: number;
  initialMonth: number; // 0-indexed (Janeiro = 0)
  appointments: AppointmentForCalendar[];
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const STATUS_DOT: Record<AppointmentForCalendar["status"], string> = {
  pending: "var(--status-yellow)",
  confirmed: "var(--color-primary)",
  completed: "var(--status-green)",
  cancelled: "var(--status-gray)",
  no_show: "var(--status-red)",
};

function toLocalDateKey(date: Date | string): string {
  return new Date(date)
    .toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Sao_Paulo",
    })
    .split("/")
    .reverse()
    .join("-");
}

// ── Toggle de visão ────────────────────────────────────────────────────────

function ViewToggle({
  view,
  setView,
}: {
  view: "month" | "week" | "day";
  setView: (v: "month" | "week" | "day") => void;
}) {
  const options: { value: "month" | "week" | "day"; label: string }[] = [
    { value: "month", label: "Mês" },
    { value: "week", label: "Semana" },
    { value: "day", label: "Dia" },
  ];

  return (
    <div
      className="flex gap-1 rounded-xl p-1 self-start"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setView(opt.value)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={
            view === opt.value
              ? {
                  backgroundColor: "var(--color-primary)",
                  color: "#ffffff",
                }
              : {
                  color: "var(--text-secondary)",
                  backgroundColor: "transparent",
                }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export function MonthlyCalendar({
  initialYear,
  initialMonth,
  appointments,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week" | "day">("month");

  // ── Navegar meses ────────────────────────────────────────────────────────
  const prevMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }, [month]);

  // ── Construir grid ───────────────────────────────────────────────────────
  const { days, appointmentsByDay } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++)
      cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const byDay: Record<string, AppointmentForCalendar[]> = {};
    for (const appt of appointments) {
      const key = toLocalDateKey(appt.startTime as Date | string);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(appt);
    }

    return { days: cells, appointmentsByDay: byDay };
  }, [year, month, appointments]);

  // ── Hoje ─────────────────────────────────────────────────────────────────
  const todayKey = toLocalDateKey(new Date());

  // ── Agendamentos do dia selecionado ──────────────────────────────────────
  const selectedAppts = useMemo(() => {
    if (!selectedDate) return [];
    return appointmentsByDay[toLocalDateKey(selectedDate)] ?? [];
  }, [selectedDate, appointmentsByDay]);

  // ── Data de referência para semana/dia (hoje ou 1º do mês navegado) ──────
  const referenceDate = new Date(year, month, new Date().getDate());

  // ── Visão Semana ─────────────────────────────────────────────────────────
  if (view === "week") {
    return (
      <div className="flex flex-col gap-4">
        <ViewToggle view={view} setView={setView} />
        <WeeklyCalendar
          initialDate={referenceDate}
          appointments={appointments}
        />
      </div>
    );
  }

  // ── Visão Dia ─────────────────────────────────────────────────────────────
  if (view === "day") {
    return (
      <div className="flex flex-col gap-4">
        <ViewToggle view={view} setView={setView} />
        <DayCalendar initialDate={referenceDate} appointments={appointments} />
      </div>
    );
  }

  // ── Visão Mês (padrão) ───────────────────────────────────────────────────
  return (
    <>
      <ViewToggle view={view} setView={setView} />
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* ── Header: navegação ── */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--bg-card-elevated)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
              aria-label="Mês anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => {
                setYear(initialYear);
                setMonth(initialMonth);
              }}
              className="px-3 h-8 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--bg-card-elevated)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Hoje
            </button>
            <button
              onClick={nextMonth}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--bg-card-elevated)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
              aria-label="Próximo mês"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ── Cabeçalho dos dias da semana ── */}
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

        {/* ── Grid de dias ── */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`empty-${i}`}
                  className="min-h-[80px]"
                  style={{
                    borderRight:
                      (i + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                    borderBottom:
                      i < days.length - 7 ? "1px solid var(--border)" : "none",
                    backgroundColor: "var(--bg-base)",
                    opacity: 0.4,
                  }}
                />
              );
            }

            const key = toLocalDateKey(day);
            const appts = appointmentsByDay[key] ?? [];
            const isToday = key === todayKey;
            const isSelected = selectedDate
              ? toLocalDateKey(selectedDate) === key
              : false;
            const col = i % 7;
            const row = Math.floor(i / 7);
            const totalRows = Math.floor(days.length / 7);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className="min-h-[80px] p-2 flex flex-col gap-1 text-left transition-all relative"
                style={{
                  borderRight: col < 6 ? "1px solid var(--border)" : "none",
                  borderBottom:
                    row < totalRows - 1 ? "1px solid var(--border)" : "none",
                  backgroundColor: isSelected
                    ? "var(--color-primary-10)"
                    : "transparent",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-card-elevated)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
                aria-label={`${day.getDate()} de ${MONTHS[month]}, ${appts.length} agendamento(s)`}
              >
                {/* Número do dia */}
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium self-start"
                  style={{
                    backgroundColor: isToday
                      ? "var(--color-primary)"
                      : "transparent",
                    color: isToday
                      ? "#FFFFFF"
                      : isSelected
                        ? "var(--color-primary)"
                        : "var(--text-primary)",
                    fontWeight: isToday || isSelected ? "700" : "400",
                  }}
                >
                  {day.getDate()}
                </span>

                {/* Dots de status (máx 3 visíveis) */}
                {appts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {appts.slice(0, 3).map((a, idx) => (
                      <span
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_DOT[a.status] }}
                      />
                    ))}
                    {appts.length > 3 && (
                      <span
                        className="text-[10px] leading-none"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        +{appts.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Contador de agendamentos */}
                {appts.length > 0 && (
                  <span
                    className="hidden sm:block text-[11px] leading-tight mt-auto"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {appts.length} agend.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel lateral do dia */}
      <DayPanel
        date={selectedDate}
        appointments={selectedAppts}
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}
