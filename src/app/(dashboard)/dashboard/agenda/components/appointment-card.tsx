"use client";

import { useDraggable } from "@dnd-kit/core";
import type { AgendaAppointment } from "../agenda-actions";
import { STATUS_CONFIG, isoToTimeBRT } from "./shared";

export type DragData = {
  appointmentId: string;
  professionalId: string;
  durationMin: number;
};

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
    </div>
  );
}
