"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { AgendaAppointment } from "../agenda-actions";

export function MoveModal({
  appointment,
  professionals,
  isPending,
  onClose,
  onMove,
}: {
  appointment: AgendaAppointment;
  professionals: { id: string; name: string }[];
  isPending: boolean;
  onClose: () => void;
  onMove: (newProfId: string) => void;
}) {
  const [profId, setProfId] = useState(appointment.professionalId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Mover Agendamento"
      size="sm"
      footer={{
        cancel: { onClick: onClose },
        confirm: {
          label: "Mover",
          onClick: () => onMove(profId),
          loading: isPending,
          loadingLabel: "Movendo…",
          disabled: profId === appointment.professionalId,
        },
      }}
    >
      <Select
        id="move-prof"
        label="Novo profissional"
        value={profId}
        onChange={(e) => setProfId(e.target.value)}
      >
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </Modal>
  );
}
