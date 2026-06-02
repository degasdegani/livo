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

const STATUS_COLOR: Record<string, string> = {
  open: "text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/20",
  closed: "text-[#9A9AA6] bg-[#9A9AA6]/10 border-[#9A9AA6]/20",
  cancelled: "text-[#C8102E] bg-[#C8102E]/10 border-[#C8102E]/20",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  voucher: "Voucher",
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
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Header */}
      <div className="border-b border-[#2A2A33] bg-[#0B0B0D] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Comandas</h1>
            <p className="mt-0.5 text-sm text-[#9A9AA6]">
              PDV — registre atendimentos e vendas
            </p>
          </div>
          {(role === "owner" || role === "reception" || role === "barber") && (
            <button
              onClick={() => router.push("/dashboard/comandas/nova")}
              className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0263D]"
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
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "border-[#C8102E] bg-[#C8102E]/10 text-[#C8102E]"
                  : "border-[#2A2A33] bg-[#17171C] text-[#9A9AA6] hover:text-white"
              }`}
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A2A33] border-t-[#C8102E]" />
          </div>
        )}

        {!isPending && comandas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#17171C]">
              <svg
                className="h-8 w-8 text-[#6E6E78]"
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
            <p className="text-[#9A9AA6]">Nenhuma comanda encontrada.</p>
            <p className="mt-1 text-sm text-[#6E6E78]">
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
                  className="group rounded-xl border border-[#2A2A33] bg-[#17171C] p-4 text-left transition-all hover:border-[#C8102E]/30 hover:bg-[#1F1F27]"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {comanda.clientName ||
                          comanda.client?.name ||
                          "Cliente avulso"}
                      </p>
                      <p className="mt-0.5 text-sm text-[#9A9AA6]">
                        {comanda.professional.name}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLOR[comanda.status]
                      }`}
                    >
                      {STATUS_LABEL[comanda.status]}
                    </span>
                  </div>

                  {/* Itens resumo */}
                  <div className="mt-3 flex gap-3 text-xs text-[#6E6E78]">
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

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between border-t border-[#2A2A33] pt-3">
                    <span className="text-sm text-[#9A9AA6]">
                      {formatDate(comanda.openedAt)} ·{" "}
                      {formatTime(comanda.openedAt)}
                    </span>
                    <span className="font-semibold text-white">
                      {formatCents(comanda.totalInCents)}
                    </span>
                  </div>

                  {comanda.paymentMethod && (
                    <p className="mt-1 text-xs text-[#9A9AA6]">
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
