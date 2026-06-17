"use client";

import { useDraggable } from "@dnd-kit/core";
import type { AgendaAppointment } from "../agenda-actions";
import { STATUS_CONFIG } from "./shared";

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

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      className={`absolute rounded border overflow-hidden transition-opacity ${config.bg} ${config.border}`}
      style={{
        top: topPx + 1,
        height: Math.max(20, heightPx - 2),
        left: leftCalc,
        width: widthCalc,
        // Ghost while dragging — DragOverlay renders the moving clone.
        opacity: isInactive ? 0.4 : isDragging ? 0.25 : 1,
        zIndex: isInactive ? 0 : 1,
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
          // Keyboard: use card's right edge as anchor since there's no clientX/Y.
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onClick(rect.right + 8, rect.top);
        }
      }}
      // Spread dnd-kit listeners/attributes only when dragging is enabled.
      // {…undefined} === {} in JS, so it's safe when disabled returns undefined.
      {...(draggable ? listeners : undefined)}
      {...(draggable ? attributes : undefined)}
    >
      {/* pointer-events-none prevents child text nodes from intercepting drag */}
      <div className="px-1.5 py-1 h-full overflow-hidden pointer-events-none">
        <p
          className="text-xs font-semibold leading-tight truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {appointment.clientName}
        </p>
        {heightPx > 28 && (
          <p
            className="text-xs leading-tight truncate mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {serviceLabel}
          </p>
        )}
      </div>
    </div>
  );
}
