"use client";

import { useState } from "react";
import { Popover } from "@/components/ui/popover";

// ── Create modal ──────────────────────────────────────────────────────────────

export function TimeBlockCreateModal({
  anchorX,
  anchorY,
  suggestedStartISO,
  suggestedEndISO,
  professionals,
  professionalId: initialProfId,
  isPending,
  onClose,
  onCreate,
}: {
  anchorX: number;
  anchorY: number;
  suggestedStartISO: string;
  suggestedEndISO: string;
  professionals?: { id: string; name: string }[];
  professionalId?: string;
  isPending: boolean;
  onClose: () => void;
  onCreate: (startISO: string, endISO: string, reason: string, professionalId: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [profId, setProfId] = useState(initialProfId ?? professionals?.[0]?.id ?? "");

  function toLocalTime(iso: string): string {
    const d = new Date(iso);
    const brtMs = d.getTime() - 3 * 60 * 60 * 1_000;
    const b = new Date(brtMs);
    return `${String(b.getUTCHours()).padStart(2, "0")}:${String(b.getUTCMinutes()).padStart(2, "0")}`;
  }

  return (
    <Popover anchorX={anchorX} anchorY={anchorY} onClose={onClose} width={260}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Bloquear horário
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-xs"
          style={{ color: "var(--text-tertiary)" }}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
        {toLocalTime(suggestedStartISO)} – {toLocalTime(suggestedEndISO)}
      </p>

      <div className="space-y-3">
        {professionals && professionals.length > 1 && (
          <div>
            <label className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Profissional
            </label>
            <select
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)" }}
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Motivo (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Almoço, Compromisso pessoal…"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)" }}
          />
        </div>

        <button
          type="button"
          onClick={() => onCreate(suggestedStartISO, suggestedEndISO, reason, profId)}
          disabled={isPending || !profId}
          className="w-full rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Confirmar bloqueio
        </button>
      </div>
    </Popover>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

export function TimeBlockDetailModal({
  anchorX,
  anchorY,
  reason,
  isPending,
  onClose,
  onDelete,
}: {
  anchorX: number;
  anchorY: number;
  reason: string | null;
  isPending: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Popover anchorX={anchorX} anchorY={anchorY} onClose={onClose} width={220}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Horário bloqueado
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-xs"
          style={{ color: "var(--text-tertiary)" }}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {reason && (
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          {reason}
        </p>
      )}

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="w-full rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--status-red)" }}
      >
        Remover bloqueio
      </button>
    </Popover>
  );
}
