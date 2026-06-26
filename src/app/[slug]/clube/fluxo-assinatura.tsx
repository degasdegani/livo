"use client";

import { useState, useTransition } from "react";
import { PlanosPublicos } from "./planos-publicos";
import { LoginCliente } from "./login-client";
import { createClientSubscription } from "./actions";
import { SeloAsaas } from "@/components/ui/selo-asaas";

type Plan = Parameters<typeof PlanosPublicos>[0]["plans"][0];

interface Props {
  plans: Plan[];
  barbershopId: string;
  barbershopName: string;
}

type FluxoStep = "planos" | "login" | "checkout";

export function FluxoAssinatura({ plans, barbershopId, barbershopName }: Props) {
  const [step, setStep] = useState<FluxoStep>("planos");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAssinar(planId: string) {
    setSelectedPlanId(planId);
    setStep("login");
  }

  function handleLoginSuccess() {
    if (!selectedPlanId) return;
    setError(null);
    startTransition(async () => {
      const result = await createClientSubscription(barbershopId, selectedPlanId);
      if (result.error) {
        setError(result.error);
        setStep("planos");
        return;
      }
      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        setStep("checkout");
      } else {
        // Sem URL de checkout (ex.: Asaas ainda não habilitado) — recarregar
        window.location.reload();
      }
    });
  }

  if (step === "login") {
    return (
      <LoginCliente
        barbershopId={barbershopId}
        barbershopName={barbershopName}
        onSuccess={handleLoginSuccess}
      />
    );
  }

  if (step === "checkout" && checkoutUrl) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "18px", marginBottom: "8px" }}>
            Finalize seu pagamento
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
            Clique no botao abaixo para inserir seu cartao e ativar o plano.
          </p>
          {error && (
            <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "16px" }}>{error}</p>
          )}
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              background: "#C8102E",
              color: "#fff",
              borderRadius: "8px",
              padding: "13px",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ir para o pagamento
          </a>
          <button
            onClick={() => setStep("planos")}
            style={{
              marginTop: "12px",
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Voltar aos planos
          </button>

          <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", paddingBottom: "24px" }}>
            <SeloAsaas />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlanosPublicos
      plans={plans}
      barbershopName={barbershopName}
      onAssinar={handleAssinar}
    />
  );
}
