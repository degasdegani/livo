// src/components/weekly-calendar.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { DayPanel, type AppointmentForCalendar } from "./day-panel";

type Props = {
  initialDate: Date;
  appointments: AppointmentForCalendar[];
};

const WEEKDAYS_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

// Retorna o domingo da semana que contém a data
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function WeeklyCalendar({ initialDate, appointments }: Props) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(initialDate));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const todayKey = toLocalDateKey(new Date());

  // Os 7 dias da semana atual
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Agendamentos agrupados por dia
  const appointmentsByDay = useMemo(() => {
    const byDay: Record<string, AppointmentForCalendar[]> = {};
    for (const appt of appointments) {
      const key = toLocalDateKey(appt.startTime as Date | string);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(appt);
    }
    return byDay;
  }, [appointments]);

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  // Label do período: "2 – 8 Jun 2026"
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const periodLabel = (() => {
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const endMonth = weekEnd.toLocaleDateString("pt-BR", {
      month: "short",
      timeZone: "America/Sao_Paulo",
    });
    const endYear = weekEnd.getFullYear();
    const startMonth =
      weekStart.getMonth() !== weekEnd.getMonth()
        ? weekStart.toLocaleDateString("pt-BR", {
            month: "short",
            timeZone: "America/Sao_Paulo",
          }) + " "
        : "";
    return `${startDay} ${startMonth}– ${endDay} ${endMonth} ${endYear}`;
  })();

  const selectedAppts = useMemo(() => {
    if (!selectedDate) return [];
    return appointmentsByDay[toLocalDateKey(selectedDate)] ?? [];
  }, [selectedDate, appointmentsByDay]);

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header navegação */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {periodLabel}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
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
              aria-label="Semana anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={goToToday}
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
              onClick={nextWeek}
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
              aria-label="Próxima semana"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Grid de 7 colunas */}
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {weekDays.map((day, i) => {
            const key = toLocalDateKey(day);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className="py-3 text-center"
                style={{
                  borderRight: i < 6 ? "1px solid var(--border)" : "none",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {WEEKDAYS_SHORT[i]}
                </p>
                <span
                  className="mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mx-auto"
                  style={{
                    backgroundColor: isToday
                      ? "var(--color-primary)"
                      : "transparent",
                    color: isToday ? "#ffffff" : "var(--text-primary)",
                  }}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Corpo: agendamentos por coluna */}
        <div className="grid grid-cols-7" style={{ minHeight: 320 }}>
          {weekDays.map((day, i) => {
            const key = toLocalDateKey(day);
            const appts = (appointmentsByDay[key] ?? []).sort(
              (a, b) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime(),
            );
            const isToday = key === todayKey;
            const isSelected = selectedDate
              ? toLocalDateKey(selectedDate) === key
              : false;

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className="flex flex-col gap-1.5 p-2 text-left transition-colors"
                style={{
                  borderRight: i < 6 ? "1px solid var(--border)" : "none",
                  borderTop: "none",
                  backgroundColor: isSelected
                    ? "var(--color-primary-10)"
                    : isToday
                      ? "rgba(200,16,46,0.03)"
                      : "transparent",
                  outline: "none",
                  minHeight: 120,
                  alignItems: "stretch",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-card-elevated)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor = isToday
                      ? "rgba(200,16,46,0.03)"
                      : "transparent";
                }}
              >
                {appts.length === 0 ? (
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)", opacity: 0.5 }}
                  >
                    —
                  </span>
                ) : (
                  appts.map((appt) => (
                    <div
                      key={appt.id}
                      className="rounded-md px-1.5 py-1 text-left"
                      style={{
                        backgroundColor: `${STATUS_DOT[appt.status]}22`,
                        borderLeft: `3px solid ${STATUS_DOT[appt.status]}`,
                      }}
                    >
                      <p
                        className="text-[11px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatTime(appt.startTime)} {appt.clientName ?? ""}
                      </p>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {appt.serviceName}
                      </p>
                    </div>
                  ))
                )}
              </button>
            );
          })}
        </div>

        {/* Footer: total da semana */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {WEEKDAYS_FULL[weekStart.getDay()]} a{" "}
            {WEEKDAYS_FULL[weekEnd.getDay()]}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {weekDays.reduce(
              (sum, d) =>
                sum + (appointmentsByDay[toLocalDateKey(d)]?.length ?? 0),
              0,
            )}{" "}
            agendamentos na semana
          </span>
        </div>
      </div>

      <DayPanel
        date={selectedDate}
        appointments={selectedAppts}
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}
