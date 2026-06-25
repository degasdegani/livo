"use client";

import { useState } from "react";
import { TV_TOKEN_KEY } from "./tv-constants";

interface Props {
  onActivated: (token: string) => void;
}

export function TvActivate({ onActivated }: Props) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pin = digits.join("");

  function handleDigit(index: number, value: string) {
    const d = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    if (d && index < 5) {
      const el = document.getElementById(`pin-${index + 1}`);
      if (el) (el as HTMLInputElement).focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const el = document.getElementById(`pin-${index - 1}`);
      if (el) (el as HTMLInputElement).focus();
    }
  }

  async function handleSubmit() {
    if (pin.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/tv/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao validar PIN.");
        setLoading(false);
        return;
      }
      localStorage.setItem(TV_TOKEN_KEY, data.token);
      onActivated(data.token);
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        gap: "2.5rem",
        padding: "2rem",
      }}
    >
      {/* Logo / marca */}
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#C8102E", fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.15rem", margin: 0 }}>
          LIVO
        </p>
        <p style={{ color: "#888", fontSize: "1rem", margin: "0.5rem 0 0" }}>
          Digite o PIN de 6 digitos exibido nas Configuracoes
        </p>
      </div>

      {/* Inputs do PIN */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {digits.map((d, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              width: "3.5rem",
              height: "4.5rem",
              textAlign: "center",
              fontSize: "2rem",
              fontWeight: 700,
              background: "#1a1a1a",
              border: `2px solid ${d ? "#C8102E" : "#333"}`,
              borderRadius: "0.5rem",
              color: "#fff",
              outline: "none",
            }}
          />
        ))}
      </div>

      {error && (
        <p style={{ color: "#ff4444", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={pin.length !== 6 || loading}
        style={{
          background: pin.length === 6 && !loading ? "#C8102E" : "#333",
          color: "#fff",
          border: "none",
          borderRadius: "0.5rem",
          padding: "0.875rem 3rem",
          fontSize: "1.1rem",
          fontWeight: 600,
          cursor: pin.length === 6 && !loading ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Verificando..." : "Ativar TV"}
      </button>
    </div>
  );
}
