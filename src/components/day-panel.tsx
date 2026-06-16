// src/components/day-panel.tsx
"use client";

import { Clock, Phone, Scissors, User } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";

// Tipos que espelham o que a page.tsx vai passar
export type AppointmentForCalendar = {
  id: string;
  startTime: Date | string;
  endTime: Date | string | null;
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

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
}

export function DayPanel({ date, appointments, onClose }: DayPanelProps) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return (
    <Drawer
      open={!!date}
      onClose={onClose}
      title="Agendamentos"
      description={date ? formatDate(date) : undefined}
    >
      <div className="flex flex-col gap-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
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

      {sorted.length > 0 && (
        <div
          className="flex items-center justify-between mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
    </Drawer>
  );
}
