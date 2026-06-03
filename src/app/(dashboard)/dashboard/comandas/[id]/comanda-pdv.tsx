// src/app/(dashboard)/dashboard/comandas/[id]/comanda-pdv.tsx
"use client";

import { PaymentMethod } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addProductItem,
  addServiceItem,
  cancelarComanda,
  fecharComanda,
  getComanda,
  removeItem,
  type ComandaWithItems,
} from "../actions";

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
  comanda: NonNullable<ComandaWithItems>;
  services: Service[];
  products: Product[];
  role: string;
  myProfessionalId: string | null;
};

const PAYMENT_OPTS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "💵 Dinheiro" },
  { value: "pix", label: "📲 PIX" },
  { value: "credit_card", label: "💳 Cartão de Crédito" },
  { value: "debit_card", label: "💳 Cartão de Débito" },
  { value: "voucher", label: "🎟️ Voucher" },
];
const PAYMENT_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Crédito",
  debit_card: "Débito",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-base)",
  padding: "10px 16px",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
};

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [discountStr, setDiscountStr] = useState("");

  const isReadOnly = comanda.status !== "open";
  const canCancel = role === "owner" || role === "reception";

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
        setError(
          err instanceof Error ? err.message : "Erro ao adicionar serviço",
        );
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
        setError(
          err instanceof Error ? err.message : "Erro ao adicionar produto",
        );
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

  function handleClose() {
    const discountCents = parseDiscountInput(discountStr);
    setError("");
    startTransition(async () => {
      try {
        await fecharComanda(comanda.id, paymentMethod, discountCents);
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
        setError(
          err instanceof Error ? err.message : "Erro ao cancelar comanda",
        );
        setShowCancelModal(false);
      }
    });
  }

  function parseDiscountInput(val: string): number {
    const cleaned = val.replace(/[^\d,\.]/g, "").replace(",", ".");
    const float = parseFloat(cleaned);
    return isNaN(float) ? 0 : Math.round(float * 100);
  }

  const discountCents = parseDiscountInput(discountStr);
  const totalBruto = comanda.items.reduce(
    (sum, item) => sum + item.totalInCents,
    0,
  );
  const totalLiquido = Math.max(0, totalBruto - discountCents);
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase()),
  );
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()),
  );

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
            onClick={() => router.push("/dashboard/comandas")}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Comanda #{comanda.id.slice(-6).toUpperCase()}
              </h1>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={STATUS_STYLE[comanda.status]}
              >
                {STATUS_LABEL[comanda.status]}
              </span>
            </div>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {comanda.professional.name}
              {(comanda.clientName || comanda.client?.name) && (
                <> · {comanda.clientName || comanda.client?.name}</>
              )}
              {comanda.status === "closed" && comanda.paymentMethod && (
                <> · {PAYMENT_LABEL[comanda.paymentMethod]}</>
              )}
            </p>
          </div>
          {canCancel && comanda.status !== "cancelled" && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="rounded-lg px-3 py-1.5 text-sm transition-colors"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
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

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Itens da comanda */}
        <div
          className="flex flex-1 flex-col p-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="mb-4 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            ITENS DA COMANDA ({comanda.items.length})
          </h2>

          {comanda.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <svg
                  className="h-6 w-6"
                  style={{ color: "var(--text-tertiary)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {isReadOnly ? "Nenhum item." : "Adicione serviços ou produtos."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {comanda.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                        style={
                          item.type === "service"
                            ? {
                                backgroundColor: "var(--color-primary-10)",
                                color: "var(--color-primary)",
                              }
                            : {
                                backgroundColor: "rgba(212,175,55,0.1)",
                                color: "var(--color-gold)",
                              }
                        }
                      >
                        {item.type === "service" ? "Serviço" : "Produto"}
                      </span>
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.type === "service"
                          ? item.serviceName
                          : item.productName}
                      </p>
                    </div>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.quantity}× {formatCents(item.unitPriceInCents)}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-3">
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatCents(item.totalInCents)}
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
                        style={{ color: "var(--text-tertiary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "var(--color-primary-10)";
                          e.currentTarget.style.color = "var(--color-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--text-tertiary)";
                        }}
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {comanda.items.length > 0 && (
            <div
              className="mt-6 rounded-xl p-4"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <div
                className="flex items-center justify-between text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>Subtotal</span>
                <span>{formatCents(totalBruto)}</span>
              </div>
              <div
                className="mt-2 flex items-center justify-between pt-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Total
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
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
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              {(["services", "products"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
                  style={
                    tab === t
                      ? {
                          backgroundColor: "var(--bg-card-elevated)",
                          color: "var(--text-primary)",
                        }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {t === "services" ? "Serviços" : "Produtos"}
                </button>
              ))}
            </div>

            {tab === "services" && (
              <>
                <input
                  type="text"
                  placeholder="Buscar serviço..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="mb-3 w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-primary)",
                  }}
                />
                <div
                  className="space-y-2 overflow-y-auto"
                  style={{ maxHeight: "60vh" }}
                >
                  {filteredServices.length === 0 ? (
                    <p
                      className="py-8 text-center text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Nenhum serviço encontrado.
                    </p>
                  ) : (
                    filteredServices.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleAddService(s.id)}
                        disabled={isPending}
                        className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-all disabled:opacity-50"
                        style={{
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--bg-card)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-primary)";
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-card-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-card)";
                        }}
                      >
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {s.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {s.durationMin} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-primary)" }}
                          >
                            {formatCents(s.priceInCents)}
                          </span>
                          <svg
                            className="h-4 w-4"
                            style={{ color: "var(--text-tertiary)" }}
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
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-primary)",
                  }}
                />
                <div
                  className="space-y-2 overflow-y-auto"
                  style={{ maxHeight: "60vh" }}
                >
                  {filteredProducts.length === 0 ? (
                    <p
                      className="py-8 text-center text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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
                              <p
                                className="truncate text-sm font-medium"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {p.name}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                Estoque: {p.stockQuantity} ·{" "}
                                {formatCents(p.priceInCents)}
                              </p>
                            </div>
                          </div>
                          {!noStock && (
                            <div className="mt-2 flex items-center gap-2">
                              <div
                                className="flex items-center rounded-lg"
                                style={{ border: "1px solid var(--border)" }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductQty((prev) => ({
                                      ...prev,
                                      [p.id]: Math.max(
                                        1,
                                        (prev[p.id] || 1) - 1,
                                      ),
                                    }))
                                  }
                                  className="flex h-8 w-8 items-center justify-center"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  −
                                </button>
                                <span
                                  className="w-8 text-center text-sm"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductQty((prev) => ({
                                      ...prev,
                                      [p.id]: Math.min(
                                        p.stockQuantity,
                                        (prev[p.id] || 1) + 1,
                                      ),
                                    }))
                                  }
                                  className="flex h-8 w-8 items-center justify-center"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => handleAddProduct(p.id)}
                                disabled={isPending}
                                className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                                style={{
                                  backgroundColor: "rgba(212,175,55,0.1)",
                                  color: "var(--color-gold)",
                                }}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
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
                                Adicionar
                              </button>
                            </div>
                          )}
                          {noStock && (
                            <p
                              className="mt-2 text-xs"
                              style={{ color: "var(--color-primary)" }}
                            >
                              Sem estoque
                            </p>
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
                onClick={() => setShowCloseModal(true)}
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
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <h2
                className="mb-3 text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                RESUMO
              </h2>
              {comanda.status === "closed" && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Pagamento
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {comanda.paymentMethod
                        ? PAYMENT_LABEL[comanda.paymentMethod]
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Fechado em
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {comanda.closedAt
                        ? new Date(comanda.closedAt).toLocaleString("pt-BR")
                        : "—"}
                    </span>
                  </div>
                  <div
                    className="mt-3 flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Total pago
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: "var(--status-green)" }}
                    >
                      {formatCents(comanda.totalInCents)}
                    </span>
                  </div>
                </>
              )}
              {comanda.status === "cancelled" && (
                <p
                  className="text-sm"
                  style={{ color: "var(--color-primary)" }}
                >
                  Esta comanda foi cancelada.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Fechar */}
      {showCloseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <h2
              className="mb-1 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Fechar Comanda
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Confirme a forma de pagamento e desconto (se houver).
            </p>

            <div
              className="mb-4 rounded-lg p-3 text-sm"
              style={{ backgroundColor: "var(--bg-base)" }}
            >
              <div
                className="flex justify-between"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>Subtotal</span>
                <span>{formatCents(totalBruto)}</span>
              </div>
              {discountCents > 0 && (
                <div
                  className="mt-1 flex justify-between"
                  style={{ color: "var(--status-yellow)" }}
                >
                  <span>Desconto</span>
                  <span>− {formatCents(discountCents)}</span>
                </div>
              )}
              <div
                className="mt-2 flex justify-between pt-2 font-semibold"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span style={{ color: "var(--text-primary)" }}>Total</span>
                <span style={{ color: "var(--status-green)" }}>
                  {formatCents(totalLiquido)}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label
                className="mb-1.5 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Desconto (R$)
              </label>
              <input
                type="text"
                placeholder="0,00"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div className="mb-6">
              <label
                className="mb-2 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Forma de pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className="rounded-lg py-2.5 text-sm font-medium transition-all"
                    style={
                      paymentMethod === opt.value
                        ? {
                            border: "1px solid var(--color-primary)",
                            backgroundColor: "var(--color-primary-10)",
                            color: "var(--text-primary)",
                          }
                        : {
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--bg-base)",
                            color: "var(--text-secondary)",
                          }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setError("");
                }}
                className="flex-1 rounded-lg py-3 text-sm transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 rounded-lg py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--status-green)" }}
              >
                {isPending
                  ? "Fechando..."
                  : `Confirmar · ${formatCents(totalLiquido)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <h2
              className="mb-2 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Cancelar Comanda
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {comanda.status === "closed"
                ? "Esta comanda já foi fechada. Cancelar vai estornar o estoque dos produtos. Tem certeza?"
                : "Tem certeza que deseja cancelar esta comanda? Esta ação não pode ser desfeita."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-lg py-3 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {isPending ? "Cancelando..." : "Cancelar Comanda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
