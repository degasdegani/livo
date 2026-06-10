// src/components/day-calendar.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { SLOT_CONFIG } from "@/lib/slot-config";
import type { AppointmentForCalendar } from "./day-panel";

type Props = {
  initialDate: Date;
  appointments: AppointmentForCalendar[];
};

const { SLOT_MINUTES } = SLOT_CONFIG;

// Slots dinâmicos de SLOT_MINUTES em SLOT_MINUTES, das 07h às 21h
const SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += SLOT_MINUTES) {
    if (h === 21 && m > 0) break;
    SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const STATUS_COLOR: Record<AppointmentForCalendar["status"], string> = {
  pending: "var(--status-yellow)",
  confirmed: "var(--color-primary)",
  completed: "var(--status-green)",
  cancelled: "var(--status-gray)",
  no_show: "var(--status-red)",
};

const STATUS_LABEL: Record<AppointmentForCalendar["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não veio",
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

function getTimeSlot(date: Date | string): string {
  const d = new Date(date);
  const h = d.toLocaleString("pt-BR", {
    hour: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
  const m = d.toLocaleString("pt-BR", {
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const snapped = Math.floor(parseInt(m, 10) / SLOT_MINUTES) * SLOT_MINUTES;
  return `${h.padStart(2, "0")}:${String(snapped).padStart(2, "0")}`;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function DayCalendar({ initialDate, appointments }: Props) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(initialDate);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const todayKey = toLocalDateKey(new Date());
  const currentKey = toLocalDateKey(currentDate);
  const isToday = currentKey === todayKey;

  function prevDay() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }

  function nextDay() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  }

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  }

  const dayLabel = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  // Agendamentos do dia atual agrupados por slot
  const appointmentsBySlot = useMemo(() => {
    const bySlot: Record<string, AppointmentForCalendar[]> = {};
    for (const appt of appointments) {
      if (toLocalDateKey(appt.startTime) !== currentKey) continue;
      const slot = getTimeSlot(appt.startTime);
      if (!bySlot[slot]) bySlot[slot] = [];
      bySlot[slot].push(appt);
    }
    return bySlot;
  }, [appointments, currentKey]);

  const totalDia = Object.values(appointmentsBySlot).flat();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h2
            className="text-lg font-semibold capitalize"
            style={{ color: "var(--text-primary)" }}
          >
            {dayLabel}
          </h2>
          {isToday && (
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              Hoje
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="Dia anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="px-3 h-8 rounded-lg text-xs font-medium transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={nextDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="Próximo dia"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Resumo do dia */}
      <div
        className="px-6 py-3 flex items-center gap-4"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-card-elevated)",
        }}
      >
        <span
          className="text-sm font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {totalDia.length} agendamento{totalDia.length !== 1 ? "s" : ""}
        </span>
        {totalDia.length > 0 && (
          <span className="text-sm" style={{ color: "var(--status-green)" }}>
            {(
              totalDia
                .filter(
                  (a) => a.status !== "cancelled" && a.status !== "no_show",
                )
                .reduce((s, a) => s + a.priceInCents, 0) / 100
            ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        )}
      </div>

      {/* Slots de horário */}
      <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
        {SLOTS.map((slot) => {
          const appts = appointmentsBySlot[slot] ?? [];
          const isFullHour = slot.endsWith(":00");

          return (
            <div
              key={slot}
              className="flex"
              style={{
                borderBottom: `1px solid ${isFullHour ? "var(--border)" : "transparent"}`,
                minHeight: 52,
              }}
            >
              {/* Label do horário */}
              <div
                className="shrink-0 flex items-start pt-2 pr-4"
                style={{
                  width: 64,
                  borderRight: "1px solid var(--border)",
                  paddingLeft: 16,
                }}
              >
                {isFullHour && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {slot}
                  </span>
                )}
              </div>

              {/* Agendamentos do slot */}
              <div className="flex-1 p-1.5 flex flex-col gap-1">
                {appts.map((appt) => {
                  const color = STATUS_COLOR[appt.status];
                  return (
                    <div
                      key={appt.id}
                      className="rounded-lg px-3 py-2 flex items-center justify-between"
                      style={{
                        backgroundColor: `${color}15`,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {formatTime(appt.startTime)}
                            {appt.endTime
                              ? ` – ${formatTime(appt.endTime)}`
                              : ""}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${color}25`,
                              color,
                            }}
                          >
                            {STATUS_LABEL[appt.status]}
                          </span>
                        </div>
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {appt.clientName ?? "Cliente não informado"}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {appt.serviceName} · {appt.professionalName}
                        </p>
                      </div>
                      <span
                        className="text-sm font-bold ml-4 shrink-0"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {(appt.priceInCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
