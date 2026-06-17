"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { AgendaAppointment, AgendaService } from "../agenda-actions";
import {
  dateTimeToISO,
  isoToDateKeyBRT,
  isoToTimeBRT,
  minToTimeStr,
  timeStrToMin,
} from "./shared";
import { ServiceChips } from "./create-modal";

export function EditModal({
  appointment,
  services,
  isPending,
  onClose,
  onEdit,
}: {
  appointment: AgendaAppointment;
  services: AgendaService[];
  isPending: boolean;
  onClose: () => void;
  onEdit: (data: {
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) => void;
}) {
  const initialIds =
    appointment.services.length > 0
      ? appointment.services
          .map((s) => s.serviceId)
          .filter((id): id is string => id !== null)
          .filter((id) => services.some((sv) => sv.id === id))
      : [appointment.serviceId];

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initialIds);
  const [dateKey, setDateKey] = useState(isoToDateKeyBRT(appointment.date));
  const [time, setTime] = useState(isoToTimeBRT(appointment.date));
  const [clientName, setClientName] = useState(appointment.clientName);
  const [clientPhone, setClientPhone] = useState(appointment.clientPhone ?? "");
  const [notes, setNotes] = useState(appointment.notes ?? "");

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const endTimeStr = totalDuration > 0 ? minToTimeStr(timeStrToMin(time) + totalDuration) : "";

  const canSubmit =
    selectedServiceIds.length > 0 &&
    clientName.trim() &&
    clientPhone.trim() &&
    dateKey &&
    time;

  function handleSubmit() {
    if (!canSubmit) return;
    onEdit({
      serviceIds: selectedServiceIds,
      dateISO: dateTimeToISO(dateKey, time),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      notes,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar Agendamento"
      size="md"
      footer={{
        cancel: { onClick: onClose },
        confirm: {
          label: "Salvar",
          onClick: handleSubmit,
          loading: isPending,
          loadingLabel: "Salvando…",
          disabled: !canSubmit,
        },
      }}
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <Input
            id="edit-date"
            label="Data"
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            required
          />
          <Input
            id="edit-time"
            label="Horário"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Serviços
          </p>
          <ServiceChips
            services={services}
            selected={selectedServiceIds}
            onChange={setSelectedServiceIds}
          />
          {totalDuration > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Duração total: {totalDuration} min
              {endTimeStr && ` · Término: ${endTimeStr}`}
            </p>
          )}
        </div>

        <Input
          id="edit-name"
          label="Nome do cliente"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
        />
        <Input
          id="edit-phone"
          label="Telefone"
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          required
        />

        <div>
          <label
            htmlFor="edit-notes"
            className="block text-xs font-medium uppercase tracking-wide mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Observações
          </label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="livo-input w-full resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
