"use client";

import { useState, useTransition } from "react";
import { cancelClientSubscription, logoutClient } from "./actions";
import { SeloAsaas } from "@/components/ui/selo-asaas";

type Usage = {
  id: string;
  serviceId: string;
  usedCount: number;
  periodStart: Date;
  periodEnd: Date;
};

type PlanItem = {
  id: string;
  serviceId: string;
  quantityPerCycle: number;
  service: { name: string; priceInCents: number };
};

type Subscription = {
  id: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  plan: {
    name: string;
    priceInCents: number;
    items: PlanItem[];
  };
  usages: Usage[];
};

interface Props {
  barbershopName: string;
  clientPhone: string;
  subscription: Subscription | null;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

export function AreaCliente({ barbershopName, clientPhone, subscription }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [accessUntil, setAccessUntil] = useState<Date | null>(null);

  function handleLogout() {
    startTransition(async () => {
      await logoutClient();
      window.location.reload();
    });
  }

  function handleCancel() {
    if (!subscription) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelClientSubscription(subscription.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCancelled(true);
      setAccessUntil(result.accessUntil ?? null);
      setCancelConfirm(false);
    });
  }

  const now = new Date();

  // Calcular saldo por serviço no ciclo atual
  const usageMap = new Map<string, number>();
  if (subscription) {
    for (const usage of subscription.usages) {
      const start = new Date(usage.periodStart);
      const end = new Date(usage.periodEnd);
      if (now >= start && now <= end) {
        usageMap.set(usage.serviceId, usage.usedCount);
      }
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: "480px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <p style={{ color: "var(--text-tertiary)", fontSize: "13px", margin: 0 }}>{barbershopName}</p>
          <h1 style={{ color: "var(--text-primary)", fontSize: "20px", fontWeight: 700, margin: "4px 0 0" }}>
            Meu Clube
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "2px 0 0" }}>
            {clientPhone}
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 12px",
            color: "var(--text-tertiary)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>

      {/* Sem assinatura */}
      {!subscription && (
        <div style={cardStyle}>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>
            Voce ainda nao tem um plano ativo.
          </p>
        </div>
      )}

      {/* Assinatura ativa */}
      {subscription && (
        <>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "16px", margin: 0 }}>
                {subscription.plan.name}
              </p>
              <span style={{
                background: subscription.status === "active" ? "#3FB95022" : "#C8102E22",
                color: subscription.status === "active" ? "#3FB950" : "#ff6b6b",
                border: `1px solid ${subscription.status === "active" ? "#3FB95055" : "#C8102E55"}`,
                borderRadius: "20px",
                padding: "2px 10px",
                fontSize: "12px",
                fontWeight: 600,
              }}>
                {subscription.status === "active" ? "Ativo" :
                 subscription.status === "suspended" ? "Suspenso" :
                 subscription.status === "cancelled" ? "Cancelado" : "Pendente"}
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 4px" }}>
              {formatBRL(subscription.plan.priceInCents)}/mes
            </p>
            {subscription.currentPeriodEnd && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "12px", margin: 0 }}>
                {subscription.status === "cancelled"
                  ? `Acesso ate ${formatDate(subscription.currentPeriodEnd)}`
                  : `Proximo ciclo: ${formatDate(subscription.currentPeriodEnd)}`}
              </p>
            )}
          </div>

          {/* Saldo do ciclo */}
          <div style={cardStyle}>
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "14px", marginBottom: "12px" }}>
              Saldo do mes
            </p>
            {subscription.plan.items.map((item) => {
              const used = usageMap.get(item.serviceId) ?? 0;
              const remaining = Math.max(0, item.quantityPerCycle - used);
              const pct = item.quantityPerCycle > 0
                ? (used / item.quantityPerCycle) * 100
                : 0;
              return (
                <div key={item.id} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      {item.service.name}
                    </span>
                    <span style={{ color: remaining > 0 ? "#3FB950" : "var(--text-tertiary)", fontSize: "13px", fontWeight: 600 }}>
                      {remaining} restante{remaining !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ background: "var(--bg-card-elevated)", borderRadius: "4px", height: "6px" }}>
                    <div style={{
                      background: pct >= 100 ? "#C8102E" : "#C8A24C",
                      borderRadius: "4px",
                      height: "6px",
                      width: `${Math.min(100, pct)}%`,
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <p style={{ color: "var(--text-tertiary)", fontSize: "11px", marginTop: "3px" }}>
                    {used} de {item.quantityPerCycle} usados
                  </p>
                </div>
              );
            })}
          </div>

          {/* Cancelamento */}
          {!cancelled && subscription.status !== "cancelled" && (
            <div style={cardStyle}>
              {!cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    color: "var(--text-tertiary)",
                    fontSize: "13px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Cancelar assinatura
                </button>
              ) : (
                <div>
                  <p style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                    Confirmar cancelamento?
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
                    Voce continuara tendo acesso ate o fim do periodo ja pago.
                  </p>
                  {error && (
                    <div style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "12px" }}>
                      {error}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      disabled={isPending}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "10px",
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isPending}
                      style={{
                        flex: 1,
                        background: "#C8102E",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: isPending ? "not-allowed" : "pointer",
                      }}
                    >
                      {isPending ? "Cancelando..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pós-cancelamento */}
          {cancelled && (
            <div style={{ ...cardStyle, borderColor: "#3FB95055", background: "#3FB95011" }}>
              <p style={{ color: "#3FB950", fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>
                Assinatura cancelada
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
                {accessUntil
                  ? `Seu acesso continua ate ${formatDate(accessUntil)}.`
                  : "Seu acesso continua ate o fim do periodo pago."}
              </p>
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", paddingBottom: "24px" }}>
        <SeloAsaas />
      </div>
    </div>
  );
}
