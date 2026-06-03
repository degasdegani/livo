// src/components/day-panel.tsx
"use client";

import { Clock, Phone, Scissors, User, X } from "lucide-react";
import { useEffect, useRef } from "react";

// Tipos que espelham o que a page.tsx vai passar
export type AppointmentForCalendar = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  clientName: string | null;
  clientPhone: string | null;
  professionalName: string;
  serviceName: string;
  priceInCents: number;
};

type DayPanelProps = {
  date: Date | null;
  appointments: AppointmentForCalendar[];
  onClose: () => void;
};

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "var(--status-yellow)" },
  confirmed: { label: "Confirmado", color: "var(--color-primary)" },
  completed: { label: "Concluído", color: "var(--status-green)" },
  cancelled: { label: "Cancelado", color: "var(--status-gray)" },
  no_show: { label: "Não veio", color: "var(--status-red)" },
};

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
}

export function DayPanel({ date, appointments, onClose }: DayPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Foca o painel quando abre (acessibilidade)
  useEffect(() => {
    if (date) panelRef.current?.focus();
  }, [date]);

  if (!date) return null;

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return (
    <>
      {/* Overlay escuro atrás do painel */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel lateral */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="fixed right-0 top-0 h-full z-50 flex flex-col outline-none"
        style={{
          width: "min(420px, 100vw)",
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        {/* Header do painel */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              Agendamentos
            </p>
            <h2
              className="text-base font-semibold mt-0.5 capitalize"
              style={{ color: "var(--text-primary)" }}
            >
              {formatDate(date)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--bg-card-elevated)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            aria-label="Fechar painel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lista de agendamentos */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Scissors size={32} style={{ color: "var(--text-tertiary)" }} />
              <p style={{ color: "var(--text-tertiary)" }} className="text-sm">
                Nenhum agendamento neste dia.
              </p>
            </div>
          ) : (
            sorted.map((appt) => {
              const status = STATUS_CONFIG[appt.status];
              return (
                <div
                  key={appt.id}
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    backgroundColor: "var(--bg-card-elevated)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Linha 1: horário + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock
                        size={13}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatTime(appt.startTime)}
                        {appt.endTime ? ` – ${formatTime(appt.endTime)}` : ""}
                      </span>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${status.color}22`,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Linha 2: cliente */}
                  <div className="flex items-center gap-2">
                    <User size={13} style={{ color: "var(--text-tertiary)" }} />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {appt.clientName ?? "Cliente não informado"}
                    </span>
                    {appt.clientPhone && (
                      <span
                        className="text-xs ml-auto flex items-center gap-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Phone size={11} />
                        {appt.clientPhone}
                      </span>
                    )}
                  </div>

                  {/* Linha 3: serviço + barbeiro + preço */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scissors
                        size={13}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {appt.serviceName}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        · {appt.professionalName}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {(appt.priceInCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer com total */}
        {sorted.length > 0 && (
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {sorted.length} agendamento{sorted.length !== 1 ? "s" : ""}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Total:{" "}
              {(
                sorted
                  .filter(
                    (a) => a.status !== "cancelled" && a.status !== "no_show",
                  )
                  .reduce((acc, a) => acc + a.priceInCents, 0) / 100
              ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
