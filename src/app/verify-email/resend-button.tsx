"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "./actions";

export function ResendButton() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleClick() {
    setError("");
    startTransition(async () => {
      const result = await resendVerificationAction();
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error ?? "Erro ao reenviar.");
      }
    });
  }

  if (done) {
    return (
      <p className="text-sm" style={{ color: "#00D4A0" }}>
        Enviamos um novo link de confirmação para o seu e-mail.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all duration-200 hover:opacity-90 disabled:opacity-60"
        style={{
          background: "#FF2D55",
          boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
        }}
      >
        {isPending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
      </button>
      {error && (
        <p className="text-sm mt-3" style={{ color: "#FF2D55" }}>
          {error}
        </p>
      )}
    </div>
  );
}
