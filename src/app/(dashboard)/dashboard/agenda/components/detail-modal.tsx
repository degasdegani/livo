"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";
import {
  buildWhatsappUrl,
  confirmationMessage,
  noShowMessage,
  reminderMessage,
  sanitizePhone,
  type WhatsappMessageData,
} from "@/lib/whatsapp";
import type { AgendaAppointment } from "../agenda-actions";
import { STATUS_CONFIG, formatCurrency, isoToTimeBRT } from "./shared";

type WhatsappType = "confirmation" | "reminder" | "noshow";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="shrink-0 w-20 text-right" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export function DetailModal({
  appointment,
  userRole,
  barbershopName,
  professionalName,
  anchorX,
  anchorY,
  onClose,
  onEdit,
  onMove,
  onStatusChange,
  onMarkWhatsapp,
  onAbrirComanda,
  onDelete,
  isPending,
}: {
  appointment: AgendaAppointment;
  userRole: string;
  barbershopName: string;
  professionalName: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onStatusChange: (status: "confirmed" | "completed" | "cancelled" | "no_show") => void;
  onMarkWhatsapp: (type: WhatsappType) => void;
  onAbrirComanda: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const config = STATUS_CONFIG[appointment.status];
  const canManage = userRole !== "barber";
  const isEditable =
    appointment.status === "pending" || appointment.status === "confirmed";
  const canDelete = isEditable && !appointment.comandaId;

  // ── Alertas WhatsApp pendentes (mesma lógica do card) ───────────────────────
  const nowMs = Date.now();
  const startMs = new Date(appointment.date).getTime();
  const endMs = appointment.endTime
    ? new Date(appointment.endTime).getTime()
    : startMs + appointment.serviceDurationMin * 60_000;
  const msUntilStart = startMs - nowMs;

  const needsConfirmation =
    appointment.status === "confirmed" && !appointment.notificationSentAt;
  const needsReminder =
    appointment.status === "confirmed" &&
    !appointment.reminderSentAt &&
    msUntilStart > 0 &&
    msUntilStart <= 3 * 60 * 60_000;
  const needsNoShow =
    (appointment.status === "confirmed" || appointment.status === "pending") &&
    !appointment.noShowReportedAt &&
    nowMs > endMs;
  const hasWhatsappAction = needsConfirmation || needsReminder || needsNoShow;

  const phone = sanitizePhone(appointment.clientPhone);

  function handleWhatsapp(type: WhatsappType) {
    if (phone) {
      const data: WhatsappMessageData = {
        clientName: appointment.clientName,
        barbershopName,
        professionalName,
        serviceName: appointment.serviceName,
        dateLabel: new Date(appointment.date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
        timeLabel: isoToTimeBRT(appointment.date),
      };
      const message =
        type === "confirmation"
          ? confirmationMessage(data)
          : type === "reminder"
            ? reminderMessage(data)
            : noShowMessage(data);
      window.open(
        buildWhatsappUrl(phone, message),
        "_blank",
        "noopener,noreferrer",
      );
    }
    onMarkWhatsapp(type);
  }

  const totalPrice =
    appointment.services.length > 0
      ? appointment.services.reduce((s, sv) => s + sv.servicePriceInCents, 0)
      : appointment.servicePriceInCents;

  return (
    <Popover anchorX={anchorX} anchorY={anchorY} onClose={onClose} width={300}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors"
          style={{ color: "var(--text-tertiary)" }}
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <InfoRow label="Cliente" value={appointment.clientName} />
        {appointment.clientPhone && (
          <InfoRow label="Telefone" value={appointment.clientPhone} />
        )}
        <InfoRow label="Horário" value={isoToTimeBRT(appointment.date)} />
        {appointment.endTime && (
          <InfoRow label="Término" value={isoToTimeBRT(appointment.endTime)} />
        )}
        {appointment.services.length > 0 ? (
          <div>
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Serviços
            </span>
            <ul className="mt-1 space-y-0.5">
              {appointment.services.map((s) => (
                <li
                  key={s.id}
                  className="text-sm flex justify-between"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span>{s.serviceName}</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {formatCurrency(s.servicePriceInCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <InfoRow
            label="Serviço"
            value={`${appointment.serviceName} — ${formatCurrency(appointment.servicePriceInCents)}`}
          />
        )}
        {appointment.services.length > 1 && (
          <InfoRow label="Total" value={formatCurrency(totalPrice)} />
        )}
        {appointment.notes && <InfoRow label="Obs." value={appointment.notes} />}
      </div>

      {canManage && hasWhatsappAction && (
        <div
          className="space-y-2 mt-3 pt-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {needsConfirmation && (
            <button
              type="button"
              onClick={() => handleWhatsapp("confirmation")}
              disabled={isPending}
              className="w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid #3B82F6", color: "#3B82F6" }}
            >
              ✉️ Confirmar agendamento
            </button>
          )}
          {needsReminder && (
            <button
              type="button"
              onClick={() => handleWhatsapp("reminder")}
              disabled={isPending}
              className="w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid #D4A72C", color: "#D4A72C" }}
            >
              🔔 Enviar lembrete
            </button>
          )}
          {needsNoShow && (
            <button
              type="button"
              onClick={() => handleWhatsapp("noshow")}
              disabled={isPending}
              className="w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid #C8102E", color: "#C8102E" }}
            >
              ⚠️ Reportar falta
            </button>
          )}
        </div>
      )}

      {canManage && isEditable && (
        <div className="space-y-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          {appointment.comandaId ? (
            <a
              href={`/dashboard/comandas/${appointment.comandaId}`}
              className="block w-full text-center rounded-lg py-2 text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Ver Comanda
            </a>
          ) : (
            <button
              type="button"
              onClick={onAbrirComanda}
              disabled={isPending}
              className="w-full rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Abrir Comanda
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-lg py-2 text-sm transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Editar
            </button>
            {(userRole === "owner" || userRole === "reception") && (
              <button
                type="button"
                onClick={onMove}
                className="flex-1 rounded-lg py-2 text-sm transition-colors"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Mover
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {appointment.status === "pending" && (
              <button
                type="button"
                onClick={() => onStatusChange("confirmed")}
                disabled={isPending}
                className="rounded-lg py-2 text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--status-green)" }}
              >
                Confirmar
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => onStatusChange("no_show")}
                disabled={isPending}
                className="rounded-lg py-2 text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--status-gray, #6b7280)" }}
              >
                Não compareceu
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => onStatusChange("cancelled")}
                disabled={isPending}
                className="rounded-lg py-2 text-xs font-medium text-white disabled:opacity-50 col-span-2"
                style={{ backgroundColor: "var(--status-red)" }}
              >
                Cancelar
              </button>
            )}
          </div>

          {canDelete && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
              className="w-full rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ border: "1px solid var(--status-red)", color: "var(--status-red)" }}
            >
              🗑 Excluir agendamento
            </button>
          )}

          {canDelete && confirmingDelete && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid var(--status-red)" }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--status-red)" }}>
                Tem certeza? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                  className="flex-1 rounded-lg py-1.5 text-xs transition-colors disabled:opacity-50"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isPending}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--status-red)" }}
                >
                  Confirmar exclusão
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}
