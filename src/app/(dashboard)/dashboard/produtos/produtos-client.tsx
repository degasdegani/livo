// src/app/(dashboard)/dashboard/produtos/produtos-client.tsx
"use client";

import type { MemberRole, StockMovementReason } from "@prisma/client";
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
import { Modal } from "@/components/ui/modal";
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

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function parseMoney(value: string): number {
  return parseInt(value.replace(/[^\d]/g, "") || "0", 10);
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

type Props = {
  products: ProductWithCategory[];
  categories: CategoryWithCount[];
  role: MemberRole;
};
type Tab = "produtos" | "categorias";
type FilterStock = "all" | "low" | "out";

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
        if (category) await updateCategory(category.id, name);
        else await createCategory(name);
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={category ? "Editar Categoria" : "Nova Categoria"}
      size="sm"
    >
      <div>
        <label
          className="mb-1.5 block text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Pomadas, Shampoos..."
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

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
    setter(formatMoneyInput(parseInt(digits || "0", 10)));
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    startTransition(async () => {
      try {
        if (product) {
          await updateProduct({
            id: product.id,
            name,
            description,
            costInCents: parseMoney(costStr),
            priceInCents: parseMoney(priceStr),
            minStockAlert: parseInt(minAlert || "0", 10),
            isActive,
            categoryId: categoryId || undefined,
          });
        } else {
          await createProduct({
            name,
            description,
            costInCents: parseMoney(costStr),
            priceInCents: parseMoney(priceStr),
            stockQuantity: parseInt(stock || "0", 10),
            minStockAlert: parseInt(minAlert || "0", 10),
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
    <Modal
      open={true}
      onClose={onClose}
      title={product ? "Editar Produto" : "Novo Produto"}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label
            className="mb-1.5 block text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Nome *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pomada Matte Black"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Descrição
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Categoria
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="mb-1.5 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Custo (R$)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={costStr}
              onChange={(e) => handleMoneyInput(e.target.value, setCostStr)}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Venda (R$) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={priceStr}
              onChange={(e) => handleMoneyInput(e.target.value, setPriceStr)}
              style={inputStyle}
            />
          </div>
        </div>
        {!product && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Estoque inicial
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Alerta mínimo
              </label>
              <input
                type="number"
                min="0"
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}
        {product && (
          <div>
            <label
              className="mb-1.5 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Alerta mínimo de estoque
            </label>
            <input
              type="number"
              min="0"
              value={minAlert}
              onChange={(e) => setMinAlert(e.target.value)}
              style={inputStyle}
            />
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Você recebe alerta quando o estoque cair abaixo deste número.
            </p>
          </div>
        )}
        {product && (
          <div
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-base)",
            }}
          >
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Produto ativo
            </span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              style={{
                color: isActive
                  ? "var(--status-green)"
                  : "var(--text-tertiary)",
              }}
            >
              {isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

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
  const [isEntry, setIsEntry] = useState(true);
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
    <Modal
      open={true}
      onClose={onClose}
      title="Movimentar Estoque"
      description={product.name}
      size="md"
    >
      <div
        className="mb-5 rounded-xl p-4"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-base)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Estoque atual
          </span>
          <span
            className={`text-2xl font-bold ${product.stockQuantity <= 0 ? "text-red-400" : product.stockQuantity <= product.minStockAlert ? "text-yellow-400" : ""}`}
            style={
              product.stockQuantity > product.minStockAlert
                ? { color: "var(--text-primary)" }
                : {}
            }
          >
            {product.stockQuantity} un.
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setIsEntry(true);
            setReason("purchase");
          }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${isEntry ? "bg-green-500/20 border border-green-500/50 text-green-400" : "text-[#6E6E78] hover:text-white"}`}
          style={!isEntry ? { border: "1px solid var(--border)" } : {}}
        >
          <TrendingUp size={16} /> Entrada
        </button>
        <button
          onClick={() => {
            setIsEntry(false);
            setReason("manual_adjustment");
          }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${!isEntry ? "bg-red-500/20 border border-red-500/50 text-red-400" : "text-[#6E6E78] hover:text-white"}`}
          style={isEntry ? { border: "1px solid var(--border)" } : {}}
        >
          <TrendingDown size={16} /> Saída
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="mb-1.5 block text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Quantidade
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Motivo
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as StockMovementReason)}
            style={inputStyle}
          >
            {(isEntry ? entryReasons : exitReasons).map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Observação (opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: NF 1234, lote B..."
            style={inputStyle}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {pending ? "Salvando..." : "Registrar"}
        </button>
      </div>

      <div
        className="mt-6 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {history === null ? (
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="flex w-full items-center justify-center gap-2 text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <History size={14} />
            {loadingHistory
              ? "Carregando..."
              : "Ver histórico de movimentações"}
          </button>
        ) : (
          <div>
            <p
              className="mb-3 text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Histórico recente
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.length === 0 && (
                <p
                  className="text-center text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Nenhuma movimentação ainda.
                </p>
              )}
              {history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: "var(--bg-base)" }}
                >
                  <div>
                    <span
                      className={`text-xs font-semibold ${REASON_COLORS[m.reason]}`}
                    >
                      {REASON_LABELS[m.reason]}
                    </span>
                    {m.notes && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {m.notes}
                      </p>
                    )}
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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
                    className={`text-sm font-bold ${m.quantity > 0 ? "text-green-400" : "text-red-400"}`}
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
    </Modal>
  );
}

export function ProdutosClient({ products, categories, role }: Props) {
  const [tab, setTab] = useState<Tab>("produtos");
  const [filterStock, setFilterStock] = useState<FilterStock>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
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

  const totalAtivos = products.filter((p) => p.isActive).length;
  const emAlerta = products.filter(
    (p) =>
      p.isActive && p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0,
  ).length;
  const semEstoque = products.filter(
    (p) => p.isActive && p.stockQuantity <= 0,
  ).length;

  function handleDeleteCategory(id: string) {
    startTransition(async () => {
      await deleteCategory(id);
      setDeletingCatId(null);
    });
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Produtos & Estoque
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Gerencie seus produtos, categorias e controle de estoque.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          {
            icon: <Package size={18} className="text-blue-400" />,
            bg: "bg-blue-500/10",
            label: "Produtos Ativos",
            value: totalAtivos,
            color: "var(--text-primary)",
          },
          {
            icon: <AlertTriangle size={18} className="text-yellow-400" />,
            bg: "bg-yellow-500/10",
            label: "Estoque Baixo",
            value: emAlerta,
            color: "var(--status-yellow)",
          },
          {
            icon: <Package size={18} className="text-red-400" />,
            bg: "bg-red-500/10",
            label: "Sem Estoque",
            value: semEstoque,
            color: "var(--status-red)",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${k.bg}`}>{k.icon}</div>
              <div>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {k.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>
                  {k.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        className="mb-6 flex items-center gap-1 rounded-xl p-1 w-fit"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        {(["produtos", "categorias"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={
              tab === t
                ? { backgroundColor: "var(--color-primary)", color: "#ffffff" }
                : { color: "var(--text-secondary)" }
            }
          >
            {t === "produtos" ? <Package size={16} /> : <Tag size={16} />}
            {t === "produtos" ? "Produtos" : "Categorias"}
          </button>
        ))}
      </div>

      {/* ABA PRODUTOS */}
      {tab === "produtos" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="flex-1 min-w-[200px] rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div
              className="flex items-center gap-1 rounded-lg p-1"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              {(["all", "low", "out"] as FilterStock[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStock(f)}
                  className="rounded px-3 py-1.5 text-xs font-medium transition-all"
                  style={
                    filterStock === f
                      ? {
                          backgroundColor: "var(--bg-card-elevated)",
                          color: "var(--text-primary)",
                        }
                      : { color: "var(--text-tertiary)" }
                  }
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
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Plus size={16} /> Novo Produto
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border-dashed py-20 text-center"
              style={{ border: "2px dashed var(--border)" }}
            >
              <PackagePlus
                size={40}
                className="mb-4"
                style={{ color: "var(--text-tertiary)" }}
              />
              <p style={{ color: "var(--text-secondary)" }}>
                Nenhum produto encontrado.
              </p>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingProduct(undefined);
                    setShowProductModal(true);
                  }}
                  className="mt-4 text-sm hover:underline"
                  style={{ color: "var(--color-primary)" }}
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
                    className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all"
                    style={{
                      border: `1px solid ${isOut ? "var(--status-red)" : isLow ? "var(--status-yellow)" : "var(--border)"}`,
                      backgroundColor: "var(--bg-card)",
                      opacity: p.isActive ? 1 : 0.5,
                    }}
                  >
                    <div
                      className={`shrink-0 rounded-lg p-2 ${isOut ? "bg-red-500/10" : isLow ? "bg-yellow-500/10" : ""}`}
                      style={
                        !isOut && !isLow
                          ? { backgroundColor: "var(--bg-card-elevated)" }
                          : {}
                      }
                    >
                      {isOut || isLow ? (
                        <AlertTriangle
                          size={18}
                          className={isOut ? "text-red-400" : "text-yellow-400"}
                        />
                      ) : (
                        <Package
                          size={18}
                          style={{ color: "var(--text-tertiary)" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {p.name}
                        </p>
                        {!p.isActive && (
                          <span
                            className="rounded px-1.5 py-0.5 text-xs"
                            style={{
                              backgroundColor: "var(--bg-card-elevated)",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3">
                        {p.category && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {p.category.name}
                          </span>
                        )}
                        {p.description && (
                          <span
                            className="text-xs truncate"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {p.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatMoney(p.priceInCents)}
                      </p>
                      {p.costInCents > 0 && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Custo: {formatMoney(p.costInCents)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <p
                        className={`text-lg font-bold ${isOut ? "text-red-400" : isLow ? "text-yellow-400" : ""}`}
                        style={
                          !isOut && !isLow
                            ? { color: "var(--text-primary)" }
                            : {}
                        }
                      >
                        {p.stockQuantity} un.
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        mín. {p.minStockAlert}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setStockProduct(p)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all"
                          style={{
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--color-primary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                          }}
                        >
                          <SlidersHorizontal size={13} /> Estoque
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setShowProductModal(true);
                          }}
                          className="rounded-lg p-1.5 transition-all"
                          style={{
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--color-primary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                          }}
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

      {/* ABA CATEGORIAS */}
      {tab === "categorias" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {categories.length} categoria{categories.length !== 1 ? "s" : ""}
            </p>
            {canEdit && (
              <button
                onClick={() => {
                  setEditingCategory(undefined);
                  setShowCategoryModal(true);
                }}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Plus size={16} /> Nova Categoria
              </button>
            )}
          </div>
          {categories.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border-dashed py-20 text-center"
              style={{ border: "2px dashed var(--border)" }}
            >
              <Tag
                size={40}
                className="mb-4"
                style={{ color: "var(--text-tertiary)" }}
              />
              <p style={{ color: "var(--text-secondary)" }}>
                Nenhuma categoria criada ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-4 rounded-xl px-5 py-4"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  <div
                    className="rounded-lg p-2"
                    style={{ backgroundColor: "var(--bg-card-elevated)" }}
                  >
                    <Tag size={18} style={{ color: "var(--color-gold)" }} />
                  </div>
                  <div className="flex-1">
                    <p
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {cat.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {cat._count.products} produto
                      {cat._count.products !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setShowCategoryModal(true);
                        }}
                        className="rounded-lg p-1.5 transition-all"
                        style={{
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
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
                            className="rounded p-1 text-red-400 hover:bg-red-500/10"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingCatId(null)}
                            className="rounded p-1"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingCatId(cat.id)}
                          className="rounded-lg p-1.5 transition-all"
                          style={{
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--status-red)";
                            e.currentTarget.style.color = "var(--status-red)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                          }}
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
