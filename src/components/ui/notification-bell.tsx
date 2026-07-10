"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// O dropdown é renderizado via portal no document.body para escapar do stacking
// context (transform/filter) criado por ancestrais como o header.
import {
  type AlertItem,
  type AlertType,
  type AppointmentAlert,
  useAppointmentAlerts,
} from "@/hooks/use-appointment-alerts";
import {
  buildWhatsappUrl,
  confirmationMessage,
  noShowMessage,
  reminderMessage,
  sanitizePhone,
  type WhatsappMessageData,
} from "@/lib/whatsapp";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";

const TYPE_META: Record<AlertType, { color: string; label: string }> = {
  confirmation: {
    color: "#3B82F6",
    label: "Confirmar agendamento",
  },
  reminder: {
    color: "#D4A72C",
    label: "Lembrete 3h",
  },
  noshow: {
    color: "#C8102E",
    label: "Reportar falta",
  },
};

function buildMessage(type: AlertType, data: WhatsappMessageData): string {
  switch (type) {
    case "confirmation":
      return confirmationMessage(data);
    case "reminder":
      return reminderMessage(data);
    case "noshow":
      return noShowMessage(data);
  }
}

function AlertRow({
  alert,
  barbershopName,
}: {
  alert: AlertItem;
  barbershopName: string;
}) {
  const meta = TYPE_META[alert.type];
  const phone = sanitizePhone(alert.clientPhone);

  const message = buildMessage(alert.type, {
    clientName: alert.clientName,
    barbershopName,
    professionalName: alert.professionalName,
    serviceName: alert.serviceName,
    dateLabel: "hoje",
    timeLabel: alert.timeLabel,
  });

  const href = phone ? buildWhatsappUrl(phone, message) : null;

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${meta.color}1A` }}
          aria-hidden="true"
        >
          <WhatsappIcon size={16} className="text-[#25D366]" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {alert.clientName}
          </p>
          <p
            className="truncate text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            {alert.professionalName} · {alert.timeLabel}
          </p>
          <p
            className="mt-0.5 text-xs font-medium"
            style={{ color: meta.color }}
          >
            {meta.label}
          </p>
        </div>
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#25D366", color: "#0a0a0a" }}
        >
          Enviar WhatsApp
        </a>
      ) : (
        <span
          className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: "var(--bg-card-elevated)",
            color: "var(--text-tertiary)",
          }}
        >
          Sem telefone
        </span>
      )}
    </div>
  );
}

export function NotificationBell({
  appointments,
  barbershopName,
}: {
  appointments: AppointmentAlert[];
  barbershopName: string;
}) {
  const alerts = useAppointmentAlerts(appointments);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const handleOpen = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  };

  // O dropdown sai do DOM do componente (portal), então o click-outside precisa
  // checar tanto o botão do sino quanto o próprio dropdown.
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (bellRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const count = alerts.length;

  return (
    <div className="relative">
      <button
        ref={bellRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg nav-link transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Notificações"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {count > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            style={{ backgroundColor: "#C8102E" }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={dropdownRef}
              className="w-80 overflow-hidden rounded-xl shadow-xl"
              style={{
                position: "fixed",
                top: dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 99999,
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Notificações
            </p>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--text-tertiary)" }}
                  aria-hidden="true"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Nenhuma notificação pendente
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertRow
                  key={`${alert.appointmentId}-${alert.type}`}
                  alert={alert}
                  barbershopName={barbershopName}
                />
              ))
            )}
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
