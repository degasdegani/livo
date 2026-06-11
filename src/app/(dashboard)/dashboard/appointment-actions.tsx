"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { updateAppointmentStatus } from "./actions";

interface ConfirmModal {
  message: string;
  subtext: string;
  status: "completed" | "cancelled" | "no_show";
  color: string;
  btnLabel: string;
}

interface Props {
  appointmentId: string;
}

export function AppointmentActions({ appointmentId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ConfirmModal | null>(null);

  function openModal(config: ConfirmModal) {
    setModal(config);
  }

  function closeModal() {
    setModal(null);
  }

  function confirm() {
    if (!modal) return;
    const status = modal.status;
    closeModal();
    startTransition(async () => {
      await updateAppointmentStatus(appointmentId, status);
    });
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="animate-spin rounded-full"
          style={{
            width: 20,
            height: 20,
            border: "2px solid rgba(255,255,255,0.1)",
            borderTopColor: "var(--color-primary)",
          }}
        />
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Salvando...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Botões */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* ✓ Concluir */}
        <button
          type="button"
          onClick={() =>
            openModal({
              message: "Marcar como concluído?",
              subtext: "O atendimento será registrado como finalizado.",
              status: "completed",
              color: "var(--status-green)",
              btnLabel: "Concluir",
            })
          }
          title="Marcar como concluído"
          className="flex items-center justify-center rounded-lg font-bold text-xs transition-all hover:opacity-80"
          style={{
            width: 30,
            height: 30,
            background: "rgba(0,212,160,0.1)",
            color: "var(--status-green)",
            border: "1px solid rgba(0,212,160,0.2)",
          }}
        >
          ✓
        </button>

        {/* ✕ Cancelar */}
        <button
          type="button"
          onClick={() =>
            openModal({
              message: "Cancelar este agendamento?",
              subtext: "Esta ação não pode ser desfeita.",
              status: "cancelled",
              color: "var(--color-primary)",
              btnLabel: "Cancelar agendamento",
            })
          }
          title="Cancelar agendamento"
          className="flex items-center justify-center rounded-lg font-bold text-xs transition-all hover:opacity-80"
          style={{
            width: 30,
            height: 30,
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-tertiary)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          ✕
        </button>

        {/* ! Faltou */}
        <button
          type="button"
          onClick={() =>
            openModal({
              message: "Marcar que o cliente faltou?",
              subtext: "O agendamento será registrado como ausência.",
              status: "no_show",
              color: "var(--status-yellow)",
              btnLabel: "Marcar faltou",
            })
          }
          title="Marcar como faltou"
          className="flex items-center justify-center rounded-lg font-bold text-xs transition-all hover:opacity-80"
          style={{
            width: 30,
            height: 30,
            background: "rgba(255,176,32,0.08)",
            color: "var(--status-yellow)",
            border: "1px solid rgba(255,176,32,0.2)",
          }}
        >
          !
        </button>
      </div>

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.message ?? ""}
        description={modal?.subtext}
        size="sm"
      >
        {modal && (
          <>
            {/* Ícone */}
            <div
              className="flex items-center justify-center rounded-2xl mx-auto"
              style={{
                width: 52,
                height: 52,
                background: `${modal.color}15`,
                border: `1.5px solid ${modal.color}30`,
              }}
            >
              <span style={{ fontSize: "22px" }}>
                {modal.status === "completed"
                  ? "✓"
                  : modal.status === "cancelled"
                    ? "✕"
                    : "!"}
              </span>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirm}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{
                  background: modal.color,
                  boxShadow: `0 4px 16px ${modal.color}40`,
                }}
              >
                {modal.btnLabel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
