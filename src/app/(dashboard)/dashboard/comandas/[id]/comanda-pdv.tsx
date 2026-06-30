// src/app/(dashboard)/dashboard/comandas/[id]/comanda-pdv.tsx
"use client";

import type { PaymentMethod } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  addComboToComanda,
  addPlanServiceToComanda,
  addProductItem,
  addServiceItem,
  type ComandaWithItems,
  type ComandaWithSubscription,
  cancelarComanda,
  fecharComanda,
  getComanda,
  reabrirComanda,
  removeItem,
} from "../actions";
import { getCombosAtivos } from "../../combos/actions";

type ComandaItem = NonNullable<ComandaWithItems>["items"][number];

type Service = {
  id: string;
  name: string;
  priceInCents: number;
  durationMin: number;
};
type Product = {
  id: string;
  name: string;
  priceInCents: number;
  stockQuantity: number;
};
type Props = {
  comanda: ComandaWithSubscription;
  services: Service[];
  products: Product[];
  role: string;
  myProfessionalId: string | null;
};

type SplitEntry = { method: PaymentMethod; amountInCents: number };

const PAYMENT_OPTS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Crédito" },
  { value: "debit_card", label: "Débito" },
  { value: "voucher", label: "Voucher" },
  { value: "cortesia", label: "Cortesia" },
  { value: "convenio", label: "Convênio" },
  { value: "outros", label: "Outros" },
];
const PAYMENT_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Crédito",
  debit_card: "Débito",
  voucher: "Voucher",
  cortesia: "Cortesia",
  convenio: "Convênio",
  outros: "Outros",
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  open: {
    color: "var(--status-green)",
    backgroundColor: "rgba(0,212,160,0.1)",
    border: "1px solid rgba(0,212,160,0.2)",
  },
  closed: {
    color: "var(--text-secondary)",
    backgroundColor: "var(--bg-card-elevated)",
    border: "1px solid var(--border)",
  },
  cancelled: {
    color: "var(--status-red)",
    backgroundColor: "var(--color-primary-10)",
    border: "1px solid var(--color-primary-20)",
  },
};
const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}


export default function ComandaPDV({
  comanda: initial,
  services,
  products,
  role,
  myProfessionalId: _myProfessionalId,
}: Props) {
  const router = useRouter();
  const [comanda, setComanda] = useState(initial);
  const [tab, setTab] = useState<"services" | "products">("services");
  const [searchService, setSearchService] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [productQty, setProductQty] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [discountInCents, setDiscountInCents] = useState(0);

  // Seletor de combos
  const [showComboSelector, setShowComboSelector] = useState(false);
  const [combos, setCombos] = useState<
    Awaited<ReturnType<typeof getCombosAtivos>>
  >([]);
  const [combosLoaded, setCombosLoaded] = useState(false);

  // Split payment state
  const [payments, setPayments] = useState<SplitEntry[]>([
    { method: "pix", amountInCents: 0 },
  ]);

  // PIN de reabertura
  const [reopenPin, setReopenPin] = useState("");
  const [reopenError, setReopenError] = useState("");

  const isReadOnly = comanda.status !== "open";
  const canCancel = role === "owner" || role === "reception";
  const canReopen = role === "owner" || role === "reception";

  async function refresh() {
    const updated = await getComanda(comanda.id);
    if (updated) setComanda(updated);
  }

  function handleAddService(serviceId: string) {
    setError("");
    startTransition(async () => {
      try {
        await addServiceItem(comanda.id, serviceId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar serviço");
      }
    });
  }

  function handleAddProduct(productId: string) {
    const qty = productQty[productId] || 1;
    setError("");
    startTransition(async () => {
      try {
        await addProductItem(comanda.id, productId, qty);
        setProductQty((prev) => ({ ...prev, [productId]: 1 }));
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar produto");
      }
    });
  }

  function handleRemoveItem(itemId: string) {
    setError("");
    startTransition(async () => {
      try {
        await removeItem(itemId, comanda.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao remover item");
      }
    });
  }

  async function openComboSelector() {
    setShowComboSelector(true);
    if (combosLoaded) return;
    try {
      const list = await getCombosAtivos(comanda.id);
      setCombos(list);
      setCombosLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar combos");
    }
  }

  function handleAddCombo(comboId: string) {
    setError("");
    startTransition(async () => {
      try {
        await addComboToComanda(comanda.id, comboId);
        setShowComboSelector(false);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar combo");
      }
    });
  }

  // Serviço coberto pelo plano: a action retorna { error } (não lança).
  function handleAddPlanService(serviceId: string) {
    const sub = comanda.activeSubscription;
    if (!sub) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await addPlanServiceToComanda(comanda.id, sub.id, serviceId);
        if (result?.error) {
          setError(result.error);
          return;
        }
        await refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao lançar serviço do plano",
        );
      }
    });
  }

  function openCloseModal() {
    const totalLiq = Math.max(0, totalBruto - discountInCents);
    setPayments([{ method: "pix", amountInCents: totalLiq }]);
    setShowCloseModal(true);
  }

  function addPaymentLine() {
    setPayments((prev) => [...prev, { method: "pix", amountInCents: 0 }]);
  }

  function removePaymentLine(idx: number) {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePaymentMethod(idx: number, method: PaymentMethod) {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, method } : p)));
  }

  function updatePaymentAmount(idx: number, cents: number) {
    setPayments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, amountInCents: cents } : p)),
    );
  }

  function handleClose() {
    setError("");
    startTransition(async () => {
      try {
        await fecharComanda(comanda.id, payments, discountInCents);
        setShowCloseModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao fechar comanda");
        setShowCloseModal(false);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      try {
        await cancelarComanda(comanda.id);
        setShowCancelModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao cancelar comanda");
        setShowCancelModal(false);
      }
    });
  }

  async function handleReopen() {
    setReopenError("");
    const result = await reabrirComanda(comanda.id, reopenPin);
    if (result.success) {
      setShowReopenModal(false);
      setReopenPin("");
      await refresh();
    } else {
      setReopenError(result.error);
    }
  }

  const discountCents = discountInCents;
  const totalBruto = comanda.items.reduce((sum, item) => sum + item.totalInCents, 0);
  const totalLiquido = Math.max(0, totalBruto - discountCents);
  const sumPaid = payments.reduce((s, p) => s + p.amountInCents, 0);
  const sumMatchesTotal = sumPaid === totalLiquido;

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase()),
  );
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()),
  );

  // Agrupamento visual por comboId — transformacao sobre os dados ja carregados,
  // sem query adicional. Itens sem comboId sao renderizados individualmente.
  type RenderGroup =
    | { kind: "single"; item: ComandaItem }
    | { kind: "combo"; comboId: string; name: string; items: ComandaItem[] }
    | { kind: "plan"; items: ComandaItem[] };

  const groupedItems: RenderGroup[] = [];
  const comboGroupIndex = new Map<string, number>();
  let planGroupIndex: number | null = null;
  for (const item of comanda.items) {
    if (item.clientSubscriptionId) {
      // Itens cobertos pelo plano — agrupados juntos (mesmo padrão dos combos).
      if (planGroupIndex !== null) {
        const group = groupedItems[planGroupIndex];
        if (group.kind === "plan") group.items.push(item);
      } else {
        planGroupIndex = groupedItems.length;
        groupedItems.push({ kind: "plan", items: [item] });
      }
    } else if (item.comboId) {
      const idx = comboGroupIndex.get(item.comboId);
      if (idx !== undefined) {
        const group = groupedItems[idx];
        if (group.kind === "combo") group.items.push(item);
      } else {
        comboGroupIndex.set(item.comboId, groupedItems.length);
        groupedItems.push({
          kind: "combo",
          comboId: item.comboId,
          name: item.combo?.name ?? "Combo",
          items: [item],
        });
      }
    } else {
      groupedItems.push({ kind: "single", item });
    }
  }

  function renderItemCard(item: ComandaItem) {
    return (
      <div
        key={item.id}
        className="flex items-center justify-between rounded-lg p-3"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
              style={
                item.type === "service"
                  ? { backgroundColor: "var(--color-primary-10)", color: "var(--color-primary)" }
                  : { backgroundColor: "rgba(212,175,55,0.1)", color: "var(--color-gold)" }
              }
            >
              {item.type === "service" ? "Serviço" : "Produto"}
            </span>
            <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {item.type === "service" ? item.serviceName : item.productName}
              {item.quantity > 1 ? ` x${item.quantity}` : ""}
            </p>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            {item.quantity}× {formatCents(item.unitPriceInCents)}
          </p>
        </div>
        <div className="ml-3 flex items-center gap-3">
          {item.clientSubscriptionId ? (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: "rgba(0,212,160,0.1)",
                color: "var(--status-green)",
              }}
            >
              {formatCents(0)} — Plano
            </span>
          ) : (
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {formatCents(item.totalInCents)}
            </span>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => handleRemoveItem(item.id)}
              disabled={isPending}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-primary-10)";
                e.currentTarget.style.color = "var(--color-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-base)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/comandas")}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Comanda #{comanda.id.slice(-6).toUpperCase()}
              </h1>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={STATUS_STYLE[comanda.status]}
              >
                {STATUS_LABEL[comanda.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {comanda.professional.name}
              {(comanda.clientName || comanda.client?.name) && (
                <> · {comanda.clientName || comanda.client?.name}</>
              )}
              {comanda.status === "closed" && comanda.paymentMethod && (
                <> · {PAYMENT_LABEL[comanda.paymentMethod]}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canReopen && comanda.status === "closed" && (
              <button
                type="button"
                onClick={() => { setReopenPin(""); setReopenError(""); setShowReopenModal(true); }}
                className="rounded-lg px-3 py-1.5 text-sm transition-colors"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--status-yellow)";
                  e.currentTarget.style.color = "var(--status-yellow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Reabrir
              </button>
            )}
            {canCancel && comanda.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="rounded-lg px-3 py-1.5 text-sm transition-colors"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.color = "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Itens da comanda */}
        <div
          className="flex flex-1 flex-col p-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="mb-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            ITENS DA COMANDA ({comanda.items.length})
          </h2>

          {comanda.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <svg aria-hidden="true" className="h-6 w-6" style={{ color: "var(--text-tertiary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {isReadOnly ? "Nenhum item." : "Adicione serviços ou produtos."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupedItems.map((group) => {
                if (group.kind === "single") return renderItemCard(group.item);

                if (group.kind === "plan") {
                  return (
                    <div
                      key="plan-group"
                      className="rounded-lg p-2"
                      style={{
                        border: "1px solid rgba(0,212,160,0.2)",
                        backgroundColor: "rgba(0,212,160,0.08)",
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span
                          className="text-xs font-semibold uppercase"
                          style={{
                            color: "var(--status-green)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Coberto pelo plano
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--status-green)" }}
                        >
                          {formatCents(0)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((item) => renderItemCard(item))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`combo-${group.comboId}`}
                    className="rounded-lg p-2"
                    style={{
                      border: "1px solid var(--color-primary-20)",
                      backgroundColor: "var(--color-primary-10)",
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span
                        className="text-xs font-semibold uppercase"
                        style={{ color: "var(--color-primary)", letterSpacing: "0.05em" }}
                      >
                        Combo · {group.name}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatCents(
                          group.items.reduce((s, it) => s + it.totalInCents, 0),
                        )}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => renderItemCard(item))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {comanda.items.length > 0 && (
            <div
              className="mt-6 rounded-xl p-4"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span>
                <span>{formatCents(totalBruto)}</span>
              </div>
              <div
                className="mt-2 flex items-center justify-between pt-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {formatCents(comanda.totalInCents)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Adicionar itens */}
        {!isReadOnly && (
          <div className="w-full p-6 lg:w-96">
            <div
              className="mb-4 flex rounded-lg p-1"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              {(["services", "products"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
                  style={
                    tab === t
                      ? { backgroundColor: "var(--bg-card-elevated)", color: "var(--text-primary)" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {t === "services" ? "Serviços" : "Produtos"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={openComboSelector}
              disabled={isPending}
              className="mb-4 flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                border: "1px solid var(--color-primary-20)",
                backgroundColor: "var(--color-primary-10)",
                color: "var(--color-primary)",
              }}
            >
              + Combo
            </button>

            {tab === "services" && (
              <>
                {comanda.activeSubscription && (
                  <div
                    className="mb-4 rounded-lg p-3"
                    style={{
                      border: "1px solid rgba(0,212,160,0.2)",
                      backgroundColor: "rgba(0,212,160,0.08)",
                    }}
                  >
                    <p
                      className="mb-2 text-xs font-semibold uppercase"
                      style={{ color: "var(--status-green)", letterSpacing: "0.05em" }}
                    >
                      Coberto pelo plano — {comanda.activeSubscription.plan.name}
                    </p>
                    <div className="space-y-2">
                      {comanda.activeSubscription.plan.items.map((planItem) => {
                        const usage = comanda.activeSubscription?.usages.find(
                          (u) => u.serviceId === planItem.serviceId,
                        );
                        const remaining = Math.max(
                          0,
                          planItem.quantityPerCycle - (usage?.usedCount ?? 0),
                        );
                        const disabled = remaining <= 0 || isPending;
                        return (
                          <button
                            key={planItem.id}
                            type="button"
                            onClick={() => handleAddPlanService(planItem.serviceId)}
                            disabled={disabled}
                            className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-all disabled:cursor-not-allowed"
                            style={{
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-card)",
                              opacity: remaining <= 0 ? 0.55 : 1,
                            }}
                          >
                            <p
                              className="truncate text-sm font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {planItem.service.name}
                            </p>
                            <span
                              className="ml-3 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                              style={
                                remaining > 0
                                  ? {
                                      backgroundColor: "rgba(0,212,160,0.1)",
                                      color: "var(--status-green)",
                                    }
                                  : {
                                      backgroundColor: "var(--bg-card-elevated)",
                                      color: "var(--text-tertiary)",
                                    }
                              }
                            >
                              {remaining} de {planItem.quantityPerCycle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Buscar serviço..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="mb-3 w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                />
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                  {filteredServices.length === 0 ? (
                    <p className="py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                      Nenhum serviço encontrado.
                    </p>
                  ) : (
                    filteredServices.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleAddService(s.id)}
                        disabled={isPending}
                        className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-all disabled:opacity-50"
                        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-primary)";
                          e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.backgroundColor = "var(--bg-card)";
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{s.durationMin} min</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                            {formatCents(s.priceInCents)}
                          </span>
                          <svg aria-hidden="true" className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {tab === "products" && (
              <>
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="mb-3 w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                />
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                  {filteredProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                      Nenhum produto encontrado.
                    </p>
                  ) : (
                    filteredProducts.map((p) => {
                      const qty = productQty[p.id] || 1;
                      const noStock = p.stockQuantity === 0;
                      return (
                        <div
                          key={p.id}
                          className="rounded-lg p-3"
                          style={{
                            border: `1px solid ${noStock ? "var(--color-primary)" : "var(--border)"}`,
                            backgroundColor: "var(--bg-card)",
                            opacity: noStock ? 0.6 : 1,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                Estoque: {p.stockQuantity} · {formatCents(p.priceInCents)}
                              </p>
                            </div>
                          </div>
                          {!noStock && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center rounded-lg" style={{ border: "1px solid var(--border)" }}>
                                <button
                                  type="button"
                                  onClick={() => setProductQty((prev) => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }))}
                                  className="flex h-8 w-8 items-center justify-center"
                                  style={{ color: "var(--text-secondary)" }}
                                >−</button>
                                <span className="w-8 text-center text-sm" style={{ color: "var(--text-primary)" }}>{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => setProductQty((prev) => ({ ...prev, [p.id]: Math.min(p.stockQuantity, (prev[p.id] || 1) + 1) }))}
                                  className="flex h-8 w-8 items-center justify-center"
                                  style={{ color: "var(--text-secondary)" }}
                                >+</button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddProduct(p.id)}
                                disabled={isPending}
                                className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                                style={{ backgroundColor: "rgba(212,175,55,0.1)", color: "var(--color-gold)" }}
                              >
                                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Adicionar
                              </button>
                            </div>
                          )}
                          {noStock && (
                            <p className="mt-2 text-xs" style={{ color: "var(--color-primary)" }}>Sem estoque</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {error && (
              <div
                className="mt-3 rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--color-primary-20)",
                  backgroundColor: "var(--color-primary-10)",
                  color: "var(--color-primary)",
                }}
              >
                {error}
              </div>
            )}

            {comanda.items.length > 0 && (
              <button
                type="button"
                onClick={openCloseModal}
                disabled={isPending}
                className="mt-4 w-full rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                Fechar Comanda · {formatCents(totalBruto)}
              </button>
            )}
          </div>
        )}

        {/* Resumo readonly */}
        {isReadOnly && (
          <div className="w-full p-6 lg:w-96">
            <div
              className="rounded-xl p-4"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                RESUMO
              </h2>
              {comanda.status === "closed" && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>Pagamento</span>
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {comanda.paymentMethod ? PAYMENT_LABEL[comanda.paymentMethod] : "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>Fechado em</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {comanda.closedAt ? new Date(comanda.closedAt).toLocaleString("pt-BR") : "—"}
                    </span>
                  </div>
                  <div
                    className="mt-3 flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total pago</span>
                    <span className="text-lg font-bold" style={{ color: "var(--status-green)" }}>
                      {formatCents(comanda.totalInCents)}
                    </span>
                  </div>
                </>
              )}
              {comanda.status === "cancelled" && (
                <p className="text-sm" style={{ color: "var(--color-primary)" }}>
                  Esta comanda foi cancelada.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Fechar Comanda — split payment */}
      <Modal
        open={showCloseModal}
        onClose={() => { setShowCloseModal(false); setError(""); }}
        title="Fechar Comanda"
        description="Informe o desconto e as formas de pagamento."
        size="md"
        footer={{
          cancel: { label: "Voltar" },
          confirm: {
            label: `Confirmar · ${formatCents(totalLiquido)}`,
            loadingLabel: "Fechando...",
            onClick: handleClose,
            loading: isPending,
            variant: "success",
            disabled: !sumMatchesTotal || payments.length === 0,
          },
        }}
      >
        {/* Resumo de valores */}
        <div className="rounded-lg p-3 text-sm mb-4" style={{ backgroundColor: "var(--bg-base)" }}>
          <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
            <span>Subtotal</span>
            <span>{formatCents(totalBruto)}</span>
          </div>
          {discountCents > 0 && (
            <div className="mt-1 flex justify-between" style={{ color: "var(--status-yellow)" }}>
              <span>Desconto</span>
              <span>− {formatCents(discountCents)}</span>
            </div>
          )}
          <div
            className="mt-2 flex justify-between pt-2 font-semibold"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--text-primary)" }}>Total</span>
            <span style={{ color: "var(--status-green)" }}>{formatCents(totalLiquido)}</span>
          </div>
        </div>

        {/* Desconto */}
        <div className="mb-5">
          <CurrencyInput
            label="Desconto"
            id="discount-input"
            valueInCents={discountInCents}
            onChange={(cents) => {
              setDiscountInCents(cents);
              // Atualiza o primeiro pagamento para totalLíquido quando há só um
              if (payments.length === 1) {
                const newTotal = Math.max(0, totalBruto - cents);
                setPayments([{ method: payments[0].method, amountInCents: newTotal }]);
              }
            }}
          />
        </div>

        {/* Split payment lines */}
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Formas de pagamento
          </p>
          <div className="space-y-2">
            {payments.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={entry.method}
                  onChange={(e) => updatePaymentMethod(idx, e.target.value as PaymentMethod)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-base)",
                    color: "var(--text-primary)",
                  }}
                >
                  {PAYMENT_OPTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <CurrencyInput
                  valueInCents={entry.amountInCents}
                  onChange={(cents) => updatePaymentAmount(idx, cents)}
                  className="w-28 rounded-lg px-3 py-2 text-sm outline-none text-right"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-base)",
                    color: "var(--text-primary)",
                  }}
                />
                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePaymentLine(idx)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                    style={{ color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPaymentLine}
            className="mt-2 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--color-primary)" }}
          >
            + Adicionar forma de pagamento
          </button>
        </div>

        {/* Indicador soma vs total */}
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm font-medium"
          style={{
            backgroundColor: sumMatchesTotal ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${sumMatchesTotal ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: sumMatchesTotal ? "var(--status-green)" : "var(--status-red)",
          }}
        >
          <div className="flex justify-between">
            <span>Total pago</span>
            <span>{formatCents(sumPaid)}</span>
          </div>
          {!sumMatchesTotal && (
            <p className="mt-0.5 text-xs opacity-80">
              {sumPaid < totalLiquido
                ? `Falta ${formatCents(totalLiquido - sumPaid)}`
                : `Excede em ${formatCents(sumPaid - totalLiquido)}`}
            </p>
          )}
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{
              border: "1px solid var(--color-primary-20)",
              backgroundColor: "var(--color-primary-10)",
              color: "var(--color-primary)",
            }}
          >
            {error}
          </div>
        )}
      </Modal>

      {/* Modal Cancelar Comanda */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Comanda"
        description={
          comanda.status === "closed"
            ? "Esta comanda já foi fechada. Cancelar vai estornar o estoque dos produtos. Tem certeza?"
            : "Tem certeza que deseja cancelar esta comanda? Esta ação não pode ser desfeita."
        }
        size="sm"
        footer={{
          cancel: { label: "Voltar" },
          confirm: {
            label: "Cancelar Comanda",
            loadingLabel: "Cancelando...",
            onClick: handleCancel,
            loading: isPending,
          },
        }}
      />

      {/* Modal Reabrir Comanda com PIN */}
      <Modal
        open={showReopenModal}
        onClose={() => { setShowReopenModal(false); setReopenPin(""); setReopenError(""); }}
        title="Reabrir Comanda"
        description="Insira o PIN de segurança para reabrir esta comanda."
        size="sm"
        footer={{
          cancel: { label: "Cancelar" },
          confirm: {
            label: "Confirmar reabertura",
            loadingLabel: "Verificando...",
            onClick: handleReopen,
            loading: isPending,
            variant: "success",
          },
        }}
      >
        <div className="space-y-3">
          <Input
            id="reopen-pin"
            label="PIN"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={reopenPin}
            onChange={(e) => setReopenPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            onKeyDown={(e) => e.key === "Enter" && handleReopen()}
          />
          {reopenError && (
            <p className="text-sm" style={{ color: "var(--status-red)" }}>{reopenError}</p>
          )}
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            O estoque e as comissões não serão revertidos — reabrir serve apenas para correção dos itens.
          </p>
        </div>
      </Modal>

      {/* Modal Seletor de Combos */}
      <Modal
        open={showComboSelector}
        onClose={() => setShowComboSelector(false)}
        title="Adicionar Combo"
        description="Selecione um combo para adicionar à comanda."
        size="md"
      >
        {!combosLoaded ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            Carregando combos...
          </p>
        ) : combos.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            Nenhum combo ativo disponível.
          </p>
        ) : (
          <div className="space-y-2">
            {combos.map((combo) => {
              const listTotal = combo.items.reduce(
                (sum, it) =>
                  sum +
                  (it.service?.priceInCents ?? it.product?.priceInCents ?? 0) *
                    (it.quantity > 0 ? it.quantity : 1),
                0,
              );
              const savings = listTotal - combo.priceInCents;
              const savingsPct =
                listTotal > 0 ? Math.round((savings / listTotal) * 100) : 0;
              return (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => handleAddCombo(combo.id)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-all disabled:opacity-50"
                  style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {combo.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {combo.items.length} {combo.items.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    {listTotal > combo.priceInCents && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)", textDecoration: "line-through" }}
                      >
                        {formatCents(listTotal)}
                      </p>
                    )}
                    <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                      {formatCents(combo.priceInCents)}
                    </p>
                    {savings > 0 && (
                      <p className="text-xs font-medium" style={{ color: "var(--status-green)" }}>
                        -{formatCents(savings)} ({savingsPct}%)
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
