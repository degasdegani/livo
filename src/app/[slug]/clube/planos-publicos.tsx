"use client";

import { useState } from "react";
import { SeloAsaas } from "@/components/ui/selo-asaas";

type PlanItem = {
  id: string;
  quantityPerCycle: number;
  service: { name: string; priceInCents: number };
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  items: PlanItem[];
  productDiscounts: {
    id: string;
    discountPct: number | null;
    discountInCents: number | null;
    product: { name: string };
  }[];
};

interface Props {
  plans: Plan[];
  barbershopName: string;
  onAssinar: (planId: string) => void;
}

function calcSavings(plan: Plan): number {
  const listTotal = plan.items.reduce(
    (acc, item) => acc + item.service.priceInCents * item.quantityPerCycle,
    0
  );
  return Math.max(0, listTotal - plan.priceInCents);
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PlanosPublicos({ plans, barbershopName, onAssinar }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!plans.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
          Nenhum plano disponivel no momento.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: "480px", margin: "0 auto" }}>
      <p style={{ color: "var(--text-tertiary)", fontSize: "13px", marginBottom: "4px" }}>
        {barbershopName}
      </p>
      <h1 style={{ color: "var(--text-primary)", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>
        Clube de Assinatura
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "28px" }}>
        Escolha o plano ideal para voce.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {plans.map((plan) => {
          const savings = calcSavings(plan);
          const isSelected = selected === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => setSelected(isSelected ? null : plan.id)}
              style={{
                background: "var(--bg-card)",
                border: `2px solid ${isSelected ? "#C8102E" : "var(--border)"}`,
                borderRadius: "12px",
                padding: "20px",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "16px", margin: 0 }}>
                    {plan.name}
                  </p>
                  {plan.description && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                      {plan.description}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#C8102E", fontWeight: 700, fontSize: "18px", margin: 0 }}>
                    {formatBRL(plan.priceInCents)}
                  </p>
                  <p style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>/mês</p>
                </div>
              </div>

              {savings > 0 && (
                <div style={{
                  marginTop: "10px",
                  background: "#3FB95022",
                  border: "1px solid #3FB95055",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  display: "inline-block",
                }}>
                  <span style={{ color: "#3FB950", fontSize: "12px", fontWeight: 600 }}>
                    Economia de {formatBRL(savings)}/mes vs avulso
                  </span>
                </div>
              )}

              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {plan.items.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      {item.service.name}
                    </span>
                    <span style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>
                      {item.quantityPerCycle}x/mes
                    </span>
                  </div>
                ))}
                {plan.productDiscounts.map((pd) => (
                  <div key={pd.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      {pd.product.name}
                    </span>
                    <span style={{ color: "#C8A24C", fontSize: "13px" }}>
                      {pd.discountPct
                        ? `${pd.discountPct}% off`
                        : pd.discountInCents
                        ? `${formatBRL(pd.discountInCents)} off`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>

              {isSelected && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAssinar(plan.id); }}
                  style={{
                    marginTop: "16px",
                    width: "100%",
                    background: "#C8102E",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Assinar este plano
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", paddingBottom: "24px" }}>
        <SeloAsaas variant="dark" />
      </div>
    </div>
  );
}
