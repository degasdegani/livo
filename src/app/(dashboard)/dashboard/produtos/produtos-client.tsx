"use client";

import { MemberRole, StockMovementReason } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  History,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import type {
  CategoryWithCount,
  ProductWithCategory,
  StockMovementWithProduct,
} from "./actions";
import {
  addStockMovement,
  createCategory,
  createProduct,
  deleteCategory,
  getStockMovements,
  updateCategory,
  updateProduct,
} from "./actions";

// ─── HELPERS ───────────────────────────────────────────────────────────────

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseMoney(value: string): number {
  const clean = value.replace(/[^\d]/g, "");
  return parseInt(clean || "0", 10);
}

function formatMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const REASON_LABELS: Record<StockMovementReason, string> = {
  purchase: "Compra / Entrada",
  comanda_use: "Uso em Comanda",
  manual_adjustment: "Ajuste Manual",
  loss: "Perda / Quebra",
  return: "Devolução",
};

const REASON_COLORS: Record<StockMovementReason, string> = {
  purchase: "text-green-400",
  comanda_use: "text-yellow-400",
  manual_adjustment: "text-blue-400",
  loss: "text-red-400",
  return: "text-purple-400",
};

// ─── PROPS ─────────────────────────────────────────────────────────────────

type Props = {
  products: ProductWithCategory[];
  categories: CategoryWithCount[];
  role: MemberRole;
};

type Tab = "produtos" | "categorias";
type FilterStock = "all" | "low" | "out";

// ─── MODAL DE CATEGORIA ────────────────────────────────────────────────────

function CategoryModal({
  category,
  onClose,
}: {
  category?: CategoryWithCount;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    startTransition(async () => {
      try {
        if (category) {
          await updateCategory(category.id, name);
        } else {
          await createCategory(name);
        }
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#2A2A33] bg-[#17171C] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {category ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pomadas, Shampoos..."
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white placeholder-[#6E6E78] focus:border-[#C8102E] focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2A2A33] py-2.5 text-sm text-[#9A9AA6] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-semibold text-white hover:bg-[#E0263D] transition-colors disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DE PRODUTO ──────────────────────────────────────────────────────

function ProductModal({
  product,
  categories,
  onClose,
}: {
  product?: ProductWithCategory;
  categories: CategoryWithCount[];
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [costStr, setCostStr] = useState(
    product ? formatMoneyInput(product.costInCents) : "0,00",
  );
  const [priceStr, setPriceStr] = useState(
    product ? formatMoneyInput(product.priceInCents) : "0,00",
  );
  const [stock, setStock] = useState(
    product ? String(product.stockQuantity) : "0",
  );
  const [minAlert, setMinAlert] = useState(
    product ? String(product.minStockAlert) : "5",
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleMoneyInput(value: string, setter: (v: string) => void) {
    const digits = value.replace(/[^\d]/g, "");
    const cents = parseInt(digits || "0", 10);
    setter(formatMoneyInput(cents));
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    const costInCents = parseMoney(costStr);
    const priceInCents = parseMoney(priceStr);
    const stockQuantity = parseInt(stock || "0", 10);
    const minStockAlert = parseInt(minAlert || "0", 10);

    startTransition(async () => {
      try {
        if (product) {
          await updateProduct({
            id: product.id,
            name,
            description,
            costInCents,
            priceInCents,
            minStockAlert,
            isActive,
            categoryId: categoryId || undefined,
          });
        } else {
          await createProduct({
            name,
            description,
            costInCents,
            priceInCents,
            stockQuantity,
            minStockAlert,
            categoryId: categoryId || undefined,
          });
        }
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#2A2A33] bg-[#17171C] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {product ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pomada Matte Black"
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white placeholder-[#6E6E78] focus:border-[#C8102E] focus:outline-none"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white placeholder-[#6E6E78] focus:border-[#C8102E] focus:outline-none"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm text-[#9A9AA6]">
                Custo (R$)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={costStr}
                onChange={(e) => handleMoneyInput(e.target.value, setCostStr)}
                className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[#9A9AA6]">
                Venda (R$) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={priceStr}
                onChange={(e) => handleMoneyInput(e.target.value, setPriceStr)}
                className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
              />
            </div>
          </div>

          {/* Estoque e alerta — só no cadastro novo */}
          {!product && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-[#9A9AA6]">
                  Estoque inicial
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-[#9A9AA6]">
                  Alerta mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAlert}
                  onChange={(e) => setMinAlert(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Alerta mínimo — na edição */}
          {product && (
            <div>
              <label className="mb-1.5 block text-sm text-[#9A9AA6]">
                Alerta mínimo de estoque
              </label>
              <input
                type="number"
                min="0"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
              />
              <p className="mt-1 text-xs text-[#6E6E78]">
                Você recebe alerta quando o estoque cair abaixo deste número.
              </p>
            </div>
          )}

          {/* Ativo/Inativo — só na edição */}
          {product && (
            <div className="flex items-center justify-between rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-3">
              <span className="text-sm text-[#9A9AA6]">Produto ativo</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`transition-colors ${isActive ? "text-green-400" : "text-[#6E6E78]"}`}
              >
                {isActive ? (
                  <ToggleRight size={28} />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2A2A33] py-2.5 text-sm text-[#9A9AA6] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-semibold text-white hover:bg-[#E0263D] transition-colors disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DE MOVIMENTAÇÃO DE ESTOQUE ─────────────────────────────────────

function StockModal({
  product,
  onClose,
}: {
  product: ProductWithCategory;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<StockMovementReason>("purchase");
  const [notes, setNotes] = useState("");
  const [isEntry, setIsEntry] = useState(true); // true = entrada, false = saída
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [history, setHistory] = useState<StockMovementWithProduct[] | null>(
    null,
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

  function loadHistory() {
    setLoadingHistory(true);
    getStockMovements(product.id).then((data) => {
      setHistory(data);
      setLoadingHistory(false);
    });
  }

  function handleSubmit() {
    const qty = parseInt(quantity || "0", 10);
    if (!qty || qty <= 0) {
      setError("Informe uma quantidade válida maior que zero.");
      return;
    }

    const finalQty = isEntry ? qty : -qty;

    startTransition(async () => {
      try {
        await addStockMovement({
          productId: product.id,
          quantity: finalQty,
          reason,
          notes,
        });
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao registrar.");
      }
    });
  }

  const entryReasons: StockMovementReason[] = ["purchase", "return"];
  const exitReasons: StockMovementReason[] = [
    "comanda_use",
    "loss",
    "manual_adjustment",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#2A2A33] bg-[#17171C] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Movimentar Estoque
            </h2>
            <p className="text-sm text-[#6E6E78]">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estoque atual */}
        <div className="mb-5 rounded-xl border border-[#2A2A33] bg-[#0B0B0D] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9A9AA6]">Estoque atual</span>
            <span
              className={`text-2xl font-bold ${
                product.stockQuantity <= 0
                  ? "text-red-400"
                  : product.stockQuantity <= product.minStockAlert
                    ? "text-yellow-400"
                    : "text-white"
              }`}
            >
              {product.stockQuantity} un.
            </span>
          </div>
        </div>

        {/* Tipo: Entrada ou Saída */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setIsEntry(true);
              setReason("purchase");
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              isEntry
                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                : "border border-[#2A2A33] text-[#6E6E78] hover:text-white"
            }`}
          >
            <TrendingUp size={16} />
            Entrada
          </button>
          <button
            onClick={() => {
              setIsEntry(false);
              setReason("manual_adjustment");
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              !isEntry
                ? "bg-red-500/20 border border-red-500/50 text-red-400"
                : "border border-[#2A2A33] text-[#6E6E78] hover:text-white"
            }`}
          >
            <TrendingDown size={16} />
            Saída
          </button>
        </div>

        <div className="space-y-4">
          {/* Quantidade */}
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white placeholder-[#6E6E78] focus:border-[#C8102E] focus:outline-none"
              autoFocus
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">
              Motivo
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockMovementReason)}
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white focus:border-[#C8102E] focus:outline-none"
            >
              {(isEntry ? entryReasons : exitReasons).map((r) => (
                <option key={r} value={r}>
                  {REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Observação */}
          <div>
            <label className="mb-1.5 block text-sm text-[#9A9AA6]">
              Observação (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: NF 1234, lote B..."
              className="w-full rounded-lg border border-[#2A2A33] bg-[#0B0B0D] px-4 py-2.5 text-white placeholder-[#6E6E78] focus:border-[#C8102E] focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2A2A33] py-2.5 text-sm text-[#9A9AA6] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-semibold text-white hover:bg-[#E0263D] transition-colors disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Registrar"}
          </button>
        </div>

        {/* Histórico */}
        <div className="mt-6 border-t border-[#2A2A33] pt-4">
          {history === null ? (
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="flex w-full items-center justify-center gap-2 text-sm text-[#9A9AA6] hover:text-white transition-colors"
            >
              <History size={14} />
              {loadingHistory
                ? "Carregando..."
                : "Ver histórico de movimentações"}
            </button>
          ) : (
            <div>
              <p className="mb-3 text-sm font-semibold text-[#9A9AA6]">
                Histórico recente
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.length === 0 && (
                  <p className="text-center text-sm text-[#6E6E78]">
                    Nenhuma movimentação ainda.
                  </p>
                )}
                {history.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-[#0B0B0D] px-3 py-2"
                  >
                    <div>
                      <span
                        className={`text-xs font-semibold ${REASON_COLORS[m.reason]}`}
                      >
                        {REASON_LABELS[m.reason]}
                      </span>
                      {m.notes && (
                        <p className="text-xs text-[#6E6E78]">{m.notes}</p>
                      )}
                      <p className="text-xs text-[#6E6E78]">
                        {new Date(m.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        m.quantity > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────

export function ProdutosClient({ products, categories, role }: Props) {
  const [tab, setTab] = useState<Tab>("produtos");
  const [filterStock, setFilterStock] = useState<FilterStock>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modais
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    CategoryWithCount | undefined
  >();
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<
    ProductWithCategory | undefined
  >();
  const [stockProduct, setStockProduct] = useState<
    ProductWithCategory | undefined
  >();

  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const canEdit = role === "owner" || role === "reception";

  // ─── FILTROS ───────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      filterCategory === "all" || p.categoryId === filterCategory;

    const matchStock =
      filterStock === "all"
        ? true
        : filterStock === "out"
          ? p.stockQuantity <= 0
          : p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0;

    return matchSearch && matchCategory && matchStock;
  });

  // ─── KPIs ──────────────────────────────────────────────────────────────

  const totalAtivos = products.filter((p) => p.isActive).length;
  const emAlerta = products.filter(
    (p) =>
      p.isActive && p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0,
  ).length;
  const semEstoque = products.filter(
    (p) => p.isActive && p.stockQuantity <= 0,
  ).length;

  // ─── HANDLERS ──────────────────────────────────────────────────────────

  function handleDeleteCategory(id: string) {
    startTransition(async () => {
      await deleteCategory(id);
      setDeletingCatId(null);
    });
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Produtos & Estoque</h1>
        <p className="mt-1 text-sm text-[#9A9AA6]">
          Gerencie seus produtos, categorias e controle de estoque.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Package size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-[#9A9AA6]">Produtos Ativos</p>
              <p className="text-2xl font-bold text-white">{totalAtivos}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <AlertTriangle size={18} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-[#9A9AA6]">Estoque Baixo</p>
              <p className="text-2xl font-bold text-yellow-400">{emAlerta}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Package size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs text-[#9A9AA6]">Sem Estoque</p>
              <p className="text-2xl font-bold text-red-400">{semEstoque}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-[#2A2A33] bg-[#17171C] p-1 w-fit">
        <button
          onClick={() => setTab("produtos")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "produtos"
              ? "bg-[#C8102E] text-white"
              : "text-[#9A9AA6] hover:text-white"
          }`}
        >
          <Package size={16} />
          Produtos
        </button>
        <button
          onClick={() => setTab("categorias")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "categorias"
              ? "bg-[#C8102E] text-white"
              : "text-[#9A9AA6] hover:text-white"
          }`}
        >
          <Tag size={16} />
          Categorias
        </button>
      </div>

      {/* ─── ABA PRODUTOS ─────────────────────────────────────────────── */}
      {tab === "produtos" && (
        <div>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {/* Busca */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="flex-1 min-w-[200px] rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-2.5 text-white placeholder-[#6E6E78] focus:border-[#C8102E] focus:outline-none text-sm"
            />

            {/* Filtro por categoria */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-[#2A2A33] bg-[#17171C] px-3 py-2.5 text-sm text-white focus:border-[#C8102E] focus:outline-none"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filtro por estoque */}
            <div className="flex items-center gap-1 rounded-lg border border-[#2A2A33] bg-[#17171C] p-1">
              {(["all", "low", "out"] as FilterStock[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStock(f)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${
                    filterStock === f
                      ? "bg-[#2A2A33] text-white"
                      : "text-[#6E6E78] hover:text-white"
                  }`}
                >
                  {f === "all"
                    ? "Todos"
                    : f === "low"
                      ? "Estoque baixo"
                      : "Sem estoque"}
                </button>
              ))}
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  setEditingProduct(undefined);
                  setShowProductModal(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E0263D] transition-colors"
              >
                <Plus size={16} />
                Novo Produto
              </button>
            )}
          </div>

          {/* Lista de produtos */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A33] py-20 text-center">
              <PackagePlus size={40} className="mb-4 text-[#6E6E78]" />
              <p className="text-[#9A9AA6]">Nenhum produto encontrado.</p>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingProduct(undefined);
                    setShowProductModal(true);
                  }}
                  className="mt-4 text-sm text-[#C8102E] hover:underline"
                >
                  Cadastrar primeiro produto
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => {
                const isLow =
                  p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0;
                const isOut = p.stockQuantity <= 0;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 rounded-xl border bg-[#17171C] px-5 py-4 transition-all ${
                      isOut
                        ? "border-red-500/30"
                        : isLow
                          ? "border-yellow-500/30"
                          : "border-[#2A2A33]"
                    } ${!p.isActive ? "opacity-50" : ""}`}
                  >
                    {/* Ícone de status */}
                    <div
                      className={`shrink-0 rounded-lg p-2 ${
                        isOut
                          ? "bg-red-500/10"
                          : isLow
                            ? "bg-yellow-500/10"
                            : "bg-[#1F1F27]"
                      }`}
                    >
                      {isOut || isLow ? (
                        <AlertTriangle
                          size={18}
                          className={isOut ? "text-red-400" : "text-yellow-400"}
                        />
                      ) : (
                        <Package size={18} className="text-[#6E6E78]" />
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">
                          {p.name}
                        </p>
                        {!p.isActive && (
                          <span className="rounded px-1.5 py-0.5 text-xs bg-[#2A2A33] text-[#6E6E78]">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3">
                        {p.category && (
                          <span className="text-xs text-[#6E6E78]">
                            {p.category.name}
                          </span>
                        )}
                        {p.description && (
                          <span className="text-xs text-[#6E6E78] truncate">
                            {p.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preço */}
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-white">
                        {formatMoney(p.priceInCents)}
                      </p>
                      {p.costInCents > 0 && (
                        <p className="text-xs text-[#6E6E78]">
                          Custo: {formatMoney(p.costInCents)}
                        </p>
                      )}
                    </div>

                    {/* Estoque */}
                    <div className="text-right shrink-0 w-24">
                      <p
                        className={`text-lg font-bold ${
                          isOut
                            ? "text-red-400"
                            : isLow
                              ? "text-yellow-400"
                              : "text-white"
                        }`}
                      >
                        {p.stockQuantity} un.
                      </p>
                      <p className="text-xs text-[#6E6E78]">
                        mín. {p.minStockAlert}
                      </p>
                    </div>

                    {/* Ações */}
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setStockProduct(p)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#2A2A33] px-3 py-1.5 text-xs text-[#9A9AA6] hover:border-[#C8102E] hover:text-white transition-all"
                          title="Movimentar estoque"
                        >
                          <SlidersHorizontal size={13} />
                          Estoque
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setShowProductModal(true);
                          }}
                          className="rounded-lg border border-[#2A2A33] p-1.5 text-[#9A9AA6] hover:border-[#C8102E] hover:text-white transition-all"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA CATEGORIAS ───────────────────────────────────────────── */}
      {tab === "categorias" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#9A9AA6]">
              {categories.length} categoria{categories.length !== 1 ? "s" : ""}
            </p>
            {canEdit && (
              <button
                onClick={() => {
                  setEditingCategory(undefined);
                  setShowCategoryModal(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E0263D] transition-colors"
              >
                <Plus size={16} />
                Nova Categoria
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A33] py-20 text-center">
              <Tag size={40} className="mb-4 text-[#6E6E78]" />
              <p className="text-[#9A9AA6]">Nenhuma categoria criada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-4 rounded-xl border border-[#2A2A33] bg-[#17171C] px-5 py-4"
                >
                  <div className="rounded-lg bg-[#1F1F27] p-2">
                    <Tag size={18} className="text-[#C8A24C]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{cat.name}</p>
                    <p className="text-xs text-[#6E6E78]">
                      {cat._count.products} produto
                      {cat._count.products !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[#6E6E78]" />
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setShowCategoryModal(true);
                        }}
                        className="rounded-lg border border-[#2A2A33] p-1.5 text-[#9A9AA6] hover:border-[#C8102E] hover:text-white transition-all"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>

                      {deletingCatId === cat.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-400">
                            Confirmar?
                          </span>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="rounded p-1 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingCatId(null)}
                            className="rounded p-1 text-[#6E6E78] hover:text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingCatId(cat.id)}
                          className="rounded-lg border border-[#2A2A33] p-1.5 text-[#9A9AA6] hover:border-red-500 hover:text-red-400 transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(undefined);
          }}
        />
      )}

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(undefined);
          }}
        />
      )}

      {stockProduct && (
        <StockModal
          product={stockProduct}
          onClose={() => setStockProduct(undefined)}
        />
      )}
    </div>
  );
}
