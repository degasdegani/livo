"use client";

import { PaymentMethod } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addProductItem,
  addServiceItem,
  cancelComanda,
  closeComanda,
  getComanda,
  removeComandaItem,
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

const STATUS_COLOR: Record<string, string> = {
  open: "text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/20",
  closed: "text-[#9A9AA6] bg-[#9A9AA6]/10 border-[#9A9AA6]/20",
  cancelled: "text-[#C8102E] bg-[#C8102E]/10 border-[#C8102E]/20",
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
  myProfessionalId,
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
      const res = await addServiceItem(comanda.id, serviceId);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        await refresh();
      }
    });
  }

  function handleAddProduct(productId: string) {
    const qty = productQty[productId] || 1;
    setError("");
    startTransition(async () => {
      const res = await addProductItem(comanda.id, productId, qty);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setProductQty((prev) => ({ ...prev, [productId]: 1 }));
        await refresh();
      }
    });
  }

  function handleRemoveItem(itemId: string) {
    setError("");
    startTransition(async () => {
      const res = await removeComandaItem(comanda.id, itemId);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        await refresh();
      }
    });
  }

  function handleClose() {
    const discountCents = parseDiscountInput(discountStr);
    setError("");
    startTransition(async () => {
      const res = await closeComanda(comanda.id, paymentMethod, discountCents);
      if ("error" in res && res.error) {
        setError(res.error);
        setShowCloseModal(false);
      } else {
        setShowCloseModal(false);
        await refresh();
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelComanda(comanda.id);
      if ("error" in res && res.error) {
        setError(res.error);
        setShowCancelModal(false);
      } else {
        setShowCancelModal(false);
        await refresh();
      }
    });
  }

  function parseDiscountInput(val: string): number {
    // Aceita "10,00" ou "10.00" → centavos
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
    <div className="flex min-h-screen flex-col bg-[#0B0B0D]">
      {/* Header */}
      <div className="border-b border-[#2A2A33] bg-[#0B0B0D] px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/comandas")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A33] text-[#9A9AA6] transition-colors hover:text-white"
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
              <h1 className="text-lg font-semibold text-white">
                Comanda #{comanda.id.slice(-6).toUpperCase()}
              </h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  STATUS_COLOR[comanda.status]
                }`}
              >
                {STATUS_LABEL[comanda.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[#9A9AA6]">
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
              className="rounded-lg border border-[#2A2A33] px-3 py-1.5 text-sm text-[#9A9AA6] transition-colors hover:border-[#C8102E]/30 hover:text-[#C8102E]"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Coluna esquerda: itens da comanda */}
        <div className="flex flex-1 flex-col border-b border-[#2A2A33] p-6 lg:border-b-0 lg:border-r">
          <h2 className="mb-4 text-sm font-medium text-[#9A9AA6]">
            ITENS DA COMANDA ({comanda.items.length})
          </h2>

          {comanda.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#17171C]">
                <svg
                  className="h-6 w-6 text-[#6E6E78]"
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
              <p className="text-sm text-[#6E6E78]">
                {isReadOnly ? "Nenhum item." : "Adicione serviços ou produtos."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {comanda.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-[#2A2A33] bg-[#17171C] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                          item.type === "service"
                            ? "bg-[#C8102E]/10 text-[#C8102E]"
                            : "bg-[#C8A24C]/10 text-[#C8A24C]"
                        }`}
                      >
                        {item.type === "service" ? "Serviço" : "Produto"}
                      </span>
                      <p className="truncate text-sm font-medium text-white">
                        {item.type === "service"
                          ? item.serviceName
                          : item.productName}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-[#9A9AA6]">
                      {item.quantity}× {formatCents(item.unitPriceInCents)}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-3">
                    <span className="font-medium text-white">
                      {formatCents(item.totalInCents)}
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#6E6E78] transition-colors hover:bg-[#C8102E]/10 hover:text-[#C8102E] disabled:opacity-50"
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

          {/* Total */}
          {comanda.items.length > 0 && (
            <div className="mt-6 rounded-xl border border-[#2A2A33] bg-[#17171C] p-4">
              <div className="flex items-center justify-between text-sm text-[#9A9AA6]">
                <span>Subtotal</span>
                <span>{formatCents(totalBruto)}</span>
              </div>
              {comanda.status === "closed" && discountCents > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm text-[#D4A72C]">
                  <span>Desconto</span>
                  <span>− {formatCents(discountCents)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-[#2A2A33] pt-2">
                <span className="font-semibold text-white">Total</span>
                <span className="text-lg font-bold text-white">
                  {formatCents(comanda.totalInCents)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita: adicionar itens */}
        {!isReadOnly && (
          <div className="w-full p-6 lg:w-96">
            {/* Tabs */}
            <div className="mb-4 flex rounded-lg border border-[#2A2A33] bg-[#17171C] p-1">
              <button
                onClick={() => setTab("services")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === "services"
                    ? "bg-[#2A2A33] text-white"
                    : "text-[#9A9AA6] hover:text-white"
                }`}
              >
                Serviços
              </button>
              <button
                onClick={() => setTab("products")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === "products"
                    ? "bg-[#2A2A33] text-white"
                    : "text-[#9A9AA6] hover:text-white"
                }`}
              >
                Produtos
              </button>
            </div>

            {/* Busca */}
            {tab === "services" && (
              <>
                <input
                  type="text"
                  placeholder="Buscar serviço..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-2.5 text-sm text-white placeholder-[#6E6E78] outline-none focus:border-[#C8102E]/50"
                />
                <div
                  className="space-y-2 overflow-y-auto"
                  style={{ maxHeight: "60vh" }}
                >
                  {filteredServices.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6E6E78]">
                      Nenhum serviço encontrado.
                    </p>
                  ) : (
                    filteredServices.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleAddService(s.id)}
                        disabled={isPending}
                        className="flex w-full items-center justify-between rounded-lg border border-[#2A2A33] bg-[#17171C] p-3 text-left transition-all hover:border-[#C8102E]/30 hover:bg-[#1F1F27] disabled:opacity-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {s.name}
                          </p>
                          <p className="text-xs text-[#9A9AA6]">
                            {s.durationMin} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#C8102E]">
                            {formatCents(s.priceInCents)}
                          </span>
                          <svg
                            className="h-4 w-4 text-[#6E6E78]"
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
                  className="mb-3 w-full rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-2.5 text-sm text-white placeholder-[#6E6E78] outline-none focus:border-[#C8102E]/50"
                />
                <div
                  className="space-y-2 overflow-y-auto"
                  style={{ maxHeight: "60vh" }}
                >
                  {filteredProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6E6E78]">
                      Nenhum produto encontrado.
                    </p>
                  ) : (
                    filteredProducts.map((p) => {
                      const qty = productQty[p.id] || 1;
                      const noStock = p.stockQuantity === 0;
                      return (
                        <div
                          key={p.id}
                          className={`rounded-lg border p-3 ${
                            noStock
                              ? "border-[#C8102E]/20 bg-[#C8102E]/5 opacity-60"
                              : "border-[#2A2A33] bg-[#17171C]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {p.name}
                              </p>
                              <p className="text-xs text-[#9A9AA6]">
                                Estoque: {p.stockQuantity} ·{" "}
                                {formatCents(p.priceInCents)}
                              </p>
                            </div>
                          </div>
                          {!noStock && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center rounded-lg border border-[#2A2A33]">
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
                                  className="flex h-8 w-8 items-center justify-center text-[#9A9AA6] hover:text-white"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center text-sm text-white">
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
                                  className="flex h-8 w-8 items-center justify-center text-[#9A9AA6] hover:text-white"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => handleAddProduct(p.id)}
                                disabled={isPending}
                                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#C8A24C]/10 py-1.5 text-sm font-medium text-[#C8A24C] transition-colors hover:bg-[#C8A24C]/20 disabled:opacity-50"
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
                            <p className="mt-2 text-xs text-[#C8102E]">
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
              <div className="mt-3 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/10 px-3 py-2 text-sm text-[#C8102E]">
                {error}
              </div>
            )}

            {/* Botão fechar */}
            {comanda.items.length > 0 && (
              <button
                onClick={() => setShowCloseModal(true)}
                disabled={isPending}
                className="mt-4 w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#E0263D] disabled:opacity-50"
              >
                Fechar Comanda · {formatCents(totalBruto)}
              </button>
            )}
          </div>
        )}

        {/* Comanda fechada/cancelada: resumo */}
        {isReadOnly && (
          <div className="w-full p-6 lg:w-96">
            <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] p-4">
              <h2 className="mb-3 text-sm font-medium text-[#9A9AA6]">
                RESUMO
              </h2>
              {comanda.status === "closed" && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9A9AA6]">Pagamento</span>
                    <span className="font-medium text-white">
                      {comanda.paymentMethod
                        ? PAYMENT_LABEL[comanda.paymentMethod]
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-[#9A9AA6]">Fechado em</span>
                    <span className="text-white">
                      {comanda.closedAt
                        ? new Date(comanda.closedAt).toLocaleString("pt-BR")
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#2A2A33] pt-3">
                    <span className="font-semibold text-white">Total pago</span>
                    <span className="text-lg font-bold text-[#3FB950]">
                      {formatCents(comanda.totalInCents)}
                    </span>
                  </div>
                </>
              )}
              {comanda.status === "cancelled" && (
                <p className="text-sm text-[#C8102E]">
                  Esta comanda foi cancelada.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Fechar comanda */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A33] bg-[#17171C] p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-semibold text-white">
              Fechar Comanda
            </h2>
            <p className="mb-6 text-sm text-[#9A9AA6]">
              Confirme a forma de pagamento e desconto (se houver).
            </p>

            {/* Resumo */}
            <div className="mb-4 rounded-lg bg-[#0B0B0D] p-3 text-sm">
              <div className="flex justify-between text-[#9A9AA6]">
                <span>Subtotal</span>
                <span>{formatCents(totalBruto)}</span>
              </div>
              {discountCents > 0 && (
                <div className="mt-1 flex justify-between text-[#D4A72C]">
                  <span>Desconto</span>
                  <span>− {formatCents(discountCents)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-[#2A2A33] pt-2 font-semibold text-white">
                <span>Total</span>
                <span className="text-[#3FB950]">
                  {formatCents(totalLiquido)}
                </span>
              </div>
            </div>

            {/* Desconto */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm text-[#9A9AA6]">
                Desconto (R$)
              </label>
              <input
                type="text"
                placeholder="0,00"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white placeholder-[#6E6E78] outline-none focus:border-[#C8102E]/50"
              />
            </div>

            {/* Forma de pagamento */}
            <div className="mb-6">
              <label className="mb-2 block text-sm text-[#9A9AA6]">
                Forma de pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      paymentMethod === opt.value
                        ? "border-[#C8102E] bg-[#C8102E]/10 text-white"
                        : "border-[#2A2A33] bg-[#0B0B0D] text-[#9A9AA6] hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/10 px-3 py-2 text-sm text-[#C8102E]">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setError("");
                }}
                className="flex-1 rounded-lg border border-[#2A2A33] py-3 text-sm text-[#9A9AA6] transition-colors hover:text-white"
              >
                Voltar
              </button>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 rounded-lg bg-[#3FB950] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3FB950]/80 disabled:opacity-50"
              >
                {isPending
                  ? "Fechando..."
                  : `Confirmar · ${formatCents(totalLiquido)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancelar comanda */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A2A33] bg-[#17171C] p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Cancelar Comanda
            </h2>
            <p className="mb-6 text-sm text-[#9A9AA6]">
              {comanda.status === "closed"
                ? "Esta comanda já foi fechada. Cancelar vai estornar o estoque dos produtos. Tem certeza?"
                : "Tem certeza que deseja cancelar esta comanda? Esta ação não pode ser desfeita."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-lg border border-[#2A2A33] py-3 text-sm text-[#9A9AA6] hover:text-white"
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 rounded-lg bg-[#C8102E] py-3 text-sm font-semibold text-white hover:bg-[#E0263D] disabled:opacity-50"
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
