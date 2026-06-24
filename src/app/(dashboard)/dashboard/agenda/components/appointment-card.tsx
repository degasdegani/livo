"use client";

import { useDraggable } from "@dnd-kit/core";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import type { AgendaAppointment } from "../agenda-actions";
import { STATUS_CONFIG, isoToTimeBRT } from "./shared";

export type DragData = {
  appointmentId: string;
  professionalId: string;
  durationMin: number;
};

type AlertStates = {
  needsConfirmation: boolean;
  needsReminder: boolean;
  needsNoShow: boolean;
};

// Calcula os alertas WhatsApp pendentes a partir do estado atual do agendamento.
function computeAlertStates(
  appointment: AgendaAppointment,
  durationMin: number,
): AlertStates {
  const nowMs = Date.now();
  const startMs = new Date(appointment.date).getTime();
  const endMs = appointment.endTime
    ? new Date(appointment.endTime).getTime()
    : startMs + durationMin * 60_000;
  const msUntilStart = startMs - nowMs;

  return {
    needsConfirmation:
      (appointment.status === "confirmed" ||
        appointment.status === "pending") &&
      !appointment.notificationSentAt,
    needsReminder:
      appointment.status === "confirmed" &&
      !appointment.reminderSentAt &&
      msUntilStart > 0 &&
      msUntilStart <= 3 * 60 * 60_000,
    needsNoShow:
      (appointment.status === "confirmed" ||
        appointment.status === "pending") &&
      !appointment.noShowReportedAt &&
      nowMs > endMs,
  };
}

// Ícones sobrepostos no canto superior direito do card.
function AlertIcons({
  states,
  compact,
}: {
  states: AlertStates;
  compact: boolean;
}) {
  const items: {
    key: string;
    color: string;
    pulse: boolean;
    label: string;
  }[] = [];
  if (states.needsConfirmation)
    items.push({
      key: "confirmation",
      color: "#3B82F6",
      pulse: false,
      label: "Confirmação pendente",
    });
  if (states.needsReminder)
    items.push({
      key: "reminder",
      color: "#D4A72C",
      pulse: true,
      label: "Lembrete pendente",
    });
  if (states.needsNoShow)
    items.push({
      key: "noshow",
      color: "#C8102E",
      pulse: true,
      label: "Falta pendente",
    });

  if (items.length === 0) return null;

  // Em pills compactos, mostra apenas o alerta de maior prioridade (último = no-show).
  const shown = compact ? items.slice(-1) : items;
  const size = compact ? 13 : 15;

  return (
    <div
      style={{
        position: "absolute",
        top: 2,
        right: 3,
        display: "flex",
        gap: 2,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      {shown.map((it) => (
        <span
          key={it.key}
          title={it.label}
          className={it.pulse ? "animate-pulse" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            borderRadius: 999,
            lineHeight: 1,
            backgroundColor: `${it.color}33`,
            border: `1px solid ${it.color}`,
          }}
        >
          <WhatsappIcon
            size={compact ? 8 : 9}
            className="text-[#25D366]"
          />
        </span>
      ))}
    </div>
  );
}

export function AppointmentCard({
  appointment,
  columnIndex,
  columnCount,
  topPx,
  heightPx,
  onClick,
  draggable = false,
  durationMin = 30,
}: {
  appointment: AgendaAppointment;
  columnIndex: number;
  columnCount: number;
  topPx: number;
  heightPx: number;
  onClick: (clientX: number, clientY: number) => void;
  draggable?: boolean;
  durationMin?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    disabled: !draggable,
    data: {
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      durationMin,
    } satisfies DragData,
  });

  const config = STATUS_CONFIG[appointment.status];
  const isInactive =
    appointment.status === "cancelled" || appointment.status === "no_show";

  const GAP = 2;
  const totalGap = GAP * (columnCount - 1);
  const leftCalc =
    columnCount === 1
      ? "0px"
      : `calc((100% - ${totalGap}px) * ${columnIndex} / ${columnCount} + ${columnIndex * GAP}px)`;
  const widthCalc =
    columnCount === 1
      ? "100%"
      : `calc((100% - ${totalGap}px) / ${columnCount})`;

  const serviceLabel =
    appointment.services.length > 1
      ? `${appointment.services[0].serviceName} +${appointment.services.length - 1}`
      : appointment.serviceName;

  const alertStates = computeAlertStates(appointment, durationMin);

  // Compact pill for very short slots
  if (heightPx < 36) {
    return (
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        style={{
          position: "absolute",
          top: topPx + 1,
          height: Math.max(16, heightPx - 2),
          left: leftCalc,
          width: widthCalc,
          opacity: isInactive ? 0.4 : isDragging ? 0.25 : 1,
          display: "flex",
          alignItems: "center",
          paddingLeft: 5,
          paddingRight: 4,
          overflow: "hidden",
          borderLeft: `2px solid ${config.color}`,
          cursor: draggable ? (isDragging ? "grabbing" : "grab") : "pointer",
          touchAction: draggable ? "none" : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e.clientX, e.clientY);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onClick(rect.right + 8, rect.top);
          }
        }}
        {...(draggable ? listeners : undefined)}
        {...(draggable ? attributes : undefined)}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {isoToTimeBRT(appointment.date)} · {appointment.clientName}
        </span>
        {alertStates.needsNoShow && (
          <div
            className="animate-pulse"
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid #C8102E",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        )}
        <AlertIcons states={alertStates} compact />
      </div>
    );
  }

  // Normal card with solid status color
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      style={{
        position: "absolute",
        top: topPx + 1,
        height: Math.max(20, heightPx - 2),
        left: leftCalc,
        width: widthCalc,
        opacity: isInactive ? 0.4 : isDragging ? 0.25 : 1,
        zIndex: isInactive ? 0 : 1,
        backgroundColor: config.color,
        borderLeft: `3px solid ${config.color}`,
        borderRadius: "0 8px 8px 0",
        overflow: "hidden",
        cursor: draggable ? (isDragging ? "grabbing" : "grab") : "pointer",
        touchAction: draggable ? "none" : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.clientX, e.clientY);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onClick(rect.right + 8, rect.top);
        }
      }}
      {...(draggable ? listeners : undefined)}
      {...(draggable ? attributes : undefined)}
    >
      <div className="px-1.5 py-1 h-full overflow-hidden pointer-events-none">
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.3,
            color: "#fff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {appointment.clientName}
        </p>
        {heightPx > 32 && (
          <p
            style={{
              fontSize: 10,
              fontWeight: 400,
              lineHeight: 1.3,
              color: "rgba(255,255,255,0.8)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: 1,
            }}
          >
            {isoToTimeBRT(appointment.date)}{serviceLabel ? ` · ${serviceLabel}` : ""}
          </p>
        )}
      </div>
      {alertStates.needsNoShow && (
        <div
          className="animate-pulse"
          style={{
            position: "absolute",
            inset: 0,
            border: "2px solid #C8102E",
            borderRadius: "0 8px 8px 0",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}
      <AlertIcons states={alertStates} compact={false} />
    </div>
  );
}
