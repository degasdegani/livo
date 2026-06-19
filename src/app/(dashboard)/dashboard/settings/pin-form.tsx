"use client";

import { useState, useTransition } from "react";
import { updateReopenPin } from "./actions";

export function PinForm({ hasPin }: { hasPin: boolean }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    setSuccess("");

    const cleaned = pin.replace(/\D/g, "");
    if (cleaned.length < 4 || cleaned.length > 6) {
      setError("PIN deve ter entre 4 e 6 dígitos numéricos.");
      return;
    }
    if (cleaned !== confirm.replace(/\D/g, "")) {
      setError("Os PINs não coincidem.");
      return;
    }

    startTransition(async () => {
      const result = await updateReopenPin(cleaned);
      if (result.success) {
        setSuccess(result.message);
        setPin("");
        setConfirm("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="px-6 py-5 space-y-4">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: hasPin ? "rgba(34,197,94,0.08)" : "var(--bg-base)",
          border: "1px solid",
          borderColor: hasPin ? "rgba(34,197,94,0.2)" : "var(--border)",
          color: hasPin ? "var(--status-green)" : "var(--text-tertiary)",
        }}
      >
        <span>{hasPin ? "✓ PIN configurado" : "PIN não configurado"}</span>
      </div>

      <div>
        <label
          htmlFor="pin-new"
          className="mb-1.5 block text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {hasPin ? "Novo PIN" : "PIN"}
        </label>
        <input
          id="pin-new"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="4 a 6 dígitos"
          className="livo-input w-full"
        />
      </div>

      <div>
        <label
          htmlFor="pin-confirm"
          className="mb-1.5 block text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Confirmar PIN
        </label>
        <input
          id="pin-confirm"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          placeholder="Repita o PIN"
          className="livo-input w-full"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm" style={{ color: "var(--status-green)" }}>{success}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !pin}
        className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {pending ? "Salvando..." : "Salvar PIN"}
      </button>
    </div>
  );
}
