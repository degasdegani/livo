// src/app/(dashboard)/dashboard/comandas/comandas-client.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getComandas } from "./actions";

type ComandaListItem = {
  id: string;
  status: string;
  paymentMethod: string | null;
  clientId: string | null;
  clientName: string;
  totalInCents: number;
  openedAt: Date;
  closedAt: Date | null;
  professional: { name: string };
  client: { name: string } | null;
  items: { type: string }[];
};

type Props = {
  initialComandas: ComandaListItem[];
  role: string;
  professionalId: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  voucher: "Voucher",
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  open: {
    color: "var(--status-green)",
    backgroundColor: "rgba(0,212,160,0.1)",
    border: "1px solid rgba(0,212,160,0.2)",
  },
  closed: {
    color: "var(--text-secondary)",
    backgroundColor: "rgba(154,154,166,0.1)",
    border: "1px solid rgba(154,154,166,0.2)",
  },
  cancelled: {
    color: "var(--status-red)",
    backgroundColor: "var(--color-primary-10)",
    border: "1px solid var(--color-primary-20)",
  },
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function ComandasClient({
  initialComandas,
  role,
  professionalId: _professionalId,
}: Props) {
  const router = useRouter();
  const [comandas, setComandas] = useState<ComandaListItem[]>(initialComandas);
  const [filter, setFilter] = useState<
    "abertas" | "fechadas" | "hoje" | "todas"
  >("abertas");
  const [isPending, startTransition] = useTransition();

  function changeFilter(f: typeof filter) {
    setFilter(f);
    startTransition(async () => {
      const updated = await getComandas(f);
      setComandas(updated as ComandaListItem[]);
    });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="px-6 py-4"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-base)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Comandas
            </h1>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              PDV — registre atendimentos e vendas
            </p>
          </div>
          {(role === "owner" || role === "reception" || role === "barber") && (
            <button
              onClick={() => router.push("/dashboard/comandas/nova")}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "var(--color-primary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--color-primary-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--color-primary)")
              }
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nova Comanda
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="mt-4 flex gap-2">
          {(["abertas", "hoje", "todas", "fechadas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                filter === f
                  ? {
                      border: "1px solid var(--color-primary)",
                      backgroundColor: "var(--color-primary-10)",
                      color: "var(--color-primary)",
                    }
                  : {
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-secondary)",
                    }
              }
            >
              {f === "abertas" && "Abertas"}
              {f === "hoje" && "Hoje"}
              {f === "todas" && "Todas"}
              {f === "fechadas" && "Fechadas"}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        {isPending && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--color-primary)",
              }}
            />
          </div>
        )}

        {!isPending && comandas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <svg
                className="h-8 w-8"
                style={{ color: "var(--text-tertiary)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p style={{ color: "var(--text-secondary)" }}>
              Nenhuma comanda encontrada.
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              Abra uma nova comanda para começar.
            </p>
          </div>
        )}

        {!isPending && comandas.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comandas.map((comanda) => {
              const serviceCount = comanda.items.filter(
                (i) => i.type === "service",
              ).length;
              const productCount = comanda.items.filter(
                (i) => i.type === "product",
              ).length;

              return (
                <button
                  key={comanda.id}
                  onClick={() =>
                    router.push(`/dashboard/comandas/${comanda.id}`)
                  }
                  className="group rounded-xl p-4 text-left transition-all"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-card-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.backgroundColor = "var(--bg-card)";
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {comanda.clientName ||
                          comanda.client?.name ||
                          "Cliente avulso"}
                      </p>
                      <p
                        className="mt-0.5 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {comanda.professional.name}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        STATUS_STYLE[comanda.status] ?? STATUS_STYLE.closed
                      }
                    >
                      {STATUS_LABEL[comanda.status]}
                    </span>
                  </div>

                  <div
                    className="mt-3 flex gap-3 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {serviceCount > 0 && (
                      <span>
                        {serviceCount} serviço{serviceCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {productCount > 0 && (
                      <span>
                        {productCount} produto{productCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {comanda.items.length === 0 && <span>Sem itens</span>}
                  </div>

                  <div
                    className="mt-3 flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatDate(comanda.openedAt)} ·{" "}
                      {formatTime(comanda.openedAt)}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatCents(comanda.totalInCents)}
                    </span>
                  </div>

                  {comanda.paymentMethod && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {PAYMENT_LABEL[comanda.paymentMethod]}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
