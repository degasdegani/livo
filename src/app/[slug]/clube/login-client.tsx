"use client";

import { useState, useTransition } from "react";
import { requestClientCode, verifyClientCode } from "./actions";

interface Props {
  barbershopId: string;
  barbershopName: string;
  onSuccess?: () => void; // se fornecido, chama em vez de reload
}

type Step = "phone" | "code";

export function LoginCliente({ barbershopId, barbershopName, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
    setError(null);
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError(null);
  }

  function handleRequestCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestClientCode(barbershopId, phone);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("code");
    });
  }

  function handleVerifyCode() {
    setError(null);
    startTransition(async () => {
      const result = await verifyClientCode(barbershopId, phone, code);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Se onSuccess fornecido, deixar o orquestrador seguir (login → checkout);
      // senão recarregar — server component detecta a sessão e mostra a área logada
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    });
  }

  function handleBack() {
    setStep("phone");
    setCode("");
    setError(null);
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "var(--bg-base)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "32px",
    width: "100%",
    maxWidth: "400px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "var(--text-secondary)",
    fontSize: "13px",
    marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "var(--text-primary)",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    background: isPending ? "var(--border)" : "#C8102E",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "13px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: isPending ? "not-allowed" : "pointer",
    marginTop: "16px",
  };

  const errorStyle: React.CSSProperties = {
    background: "#C8102E22",
    border: "1px solid #C8102E55",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#ff6b6b",
    fontSize: "13px",
    marginTop: "12px",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              color: "var(--text-tertiary)",
              fontSize: "13px",
              marginBottom: "4px",
            }}
          >
            {barbershopName}
          </p>
          <h1
            style={{
              color: "var(--text-primary)",
              fontSize: "22px",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {step === "phone" ? "Entrar no Clube" : "Confirmar código"}
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              marginTop: "6px",
            }}
          >
            {step === "phone"
              ? "Digite seu telefone para receber um código de acesso."
              : `Enviamos um código de 6 dígitos para ${phone}.`}
          </p>
        </div>

        {/* Step: phone */}
        {step === "phone" && (
          <>
            <label style={labelStyle} htmlFor="phone">
              Telefone (com DDD)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={handlePhoneChange}
              style={inputStyle}
              disabled={isPending}
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button
              onClick={handleRequestCode}
              disabled={isPending || phone.replace(/\D/g, "").length < 10}
              style={buttonStyle}
            >
              {isPending ? "Enviando..." : "Receber código"}
            </button>
          </>
        )}

        {/* Step: code */}
        {step === "code" && (
          <>
            <label style={labelStyle} htmlFor="code">
              Código de 6 dígitos
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              style={{ ...inputStyle, letterSpacing: "6px", fontSize: "20px" }}
              disabled={isPending}
              maxLength={6}
              autoFocus
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button
              onClick={handleVerifyCode}
              disabled={isPending || code.length < 6}
              style={buttonStyle}
            >
              {isPending ? "Verificando..." : "Entrar"}
            </button>
            <button
              onClick={handleBack}
              disabled={isPending}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                fontSize: "13px",
                marginTop: "12px",
                cursor: "pointer",
                padding: "8px",
              }}
            >
              Usar outro telefone
            </button>
          </>
        )}
      </div>
    </div>
  );
}
