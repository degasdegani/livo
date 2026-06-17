"use client";

import type { AgendaAppointment } from "../agenda-actions";
import { STATUS_CONFIG } from "./shared";

export function AppointmentCard({
  appointment,
  columnIndex,
  columnCount,
  topPx,
  heightPx,
  onClick,
}: {
  appointment: AgendaAppointment;
  columnIndex: number;
  columnCount: number;
  topPx: number;
  heightPx: number;
  onClick: () => void;
}) {
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
      role="button"
      tabIndex={0}
      className={`absolute rounded border overflow-hidden cursor-pointer transition-opacity ${config.bg} ${config.border}`}
      style={{
        top: topPx + 1,
        height: Math.max(20, heightPx - 2),
        left: leftCalc,
        width: widthCalc,
        opacity: isInactive ? 0.4 : 1,
        zIndex: isInactive ? 0 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="px-1.5 py-1 h-full overflow-hidden">
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
