"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import {
  createCombo,
  updateCombo,
  toggleComboActive,
  getCombosData,
  type ComboFormData,
  type ComboItemInput,
} from "./actions";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Service = { id: string; name: string; priceInCents: number };
type Product = { id: string; name: string; priceInCents: number };

type ComboItemWithDetails = {
  id: string;
  type: "service" | "product";
  serviceId: string | null;
  productId: string | null;
  quantity: number;
  service: Service | null;
  product: Product | null;
};

type Combo = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  commissionPercent: number | null;
  isActive: boolean;
  items: ComboItemWithDetails[];
};

type CombosData = Awaited<ReturnType<typeof getCombosData>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcListTotal(items: ComboItemWithDetails[]): number {
  return items.reduce((sum, item) => {
    const price = item.service?.priceInCents ?? item.product?.priceInCents ?? 0;
    return sum + price;
  }, 0);
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calcSavings(listTotal: number, comboPrice: number) {
  const savings = listTotal - comboPrice;
  const pct = listTotal > 0 ? Math.round((savings / listTotal) * 100) : 0;
  return { savings, pct };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalProps = {
  combo?: Combo;
  services: Service[];
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
};

function ComboModal({ combo, services, products, onClose, onSuccess }: ModalProps) {
  const isEdit = !!combo;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(combo?.name ?? "");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [priceStr, setPriceStr] = useState(
    combo ? (combo.priceInCents / 100).toFixed(2) : ""
  );
  const [commissionStr, setCommissionStr] = useState(
    combo?.commissionPercent != null ? String(combo.commissionPercent) : ""
  );
  const [selectedItems, setSelectedItems] = useState<ComboItemInput[]>(
    combo?.items.map((i) => ({
      type: i.type,
      serviceId: i.serviceId ?? undefined,
      productId: i.productId ?? undefined,
    })) ?? []
  );
  const [error, setError] = useState("");

  // Calcula preço de lista atual dos itens selecionados
  function calcCurrentListTotal(): number {
    return selectedItems.reduce((sum, item) => {
      if (item.type === "service" && item.serviceId) {
        const svc = services.find((s) => s.id === item.serviceId);
        return sum + (svc?.priceInCents ?? 0);
      }
      if (item.type === "product" && item.productId) {
        const prd = products.find((p) => p.id === item.productId);
        return sum + (prd?.priceInCents ?? 0);
      }
      return sum;
    }, 0);
  }

  function addItem(type: "service" | "product", id: string) {
    const alreadyIn = selectedItems.some(
      (i) =>
        (type === "service" && i.serviceId === id) ||
        (type === "product" && i.productId === id)
    );
    if (alreadyIn) return;
    setSelectedItems((prev) => [
      ...prev,
      type === "service" ? { type, serviceId: id } : { type, productId: id },
    ]);
  }

  function removeItem(index: number) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  }

  function getItemLabel(item: ComboItemInput): string {
    if (item.type === "service" && item.serviceId) {
      return services.find((s) => s.id === item.serviceId)?.name ?? "Servico";
    }
    if (item.type === "product" && item.productId) {
      return products.find((p) => p.id === item.productId)?.name ?? "Produto";
    }
    return "";
  }

  function getItemPrice(item: ComboItemInput): number {
    if (item.type === "service" && item.serviceId) {
      return services.find((s) => s.id === item.serviceId)?.priceInCents ?? 0;
    }
    if (item.type === "product" && item.productId) {
      return products.find((p) => p.id === item.productId)?.priceInCents ?? 0;
    }
    return 0;
  }

  function handleSubmit() {
    setError("");
    const priceInCents = Math.round(parseFloat(priceStr.replace(",", ".")) * 100);
    const commissionPercent =
      commissionStr.trim() !== "" ? parseFloat(commissionStr) : undefined;

    const formData: ComboFormData = {
      name,
      description: description || undefined,
      priceInCents,
      commissionPercent,
      items: selectedItems,
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateCombo(combo.id, formData);
        } else {
          await createCombo(formData);
        }
        toast(isEdit ? "Combo atualizado!" : "Combo criado!", "success");
        onSuccess();
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao salvar combo.";
        setError(message);
        toast(message, "error");
      }
    });
  }

  const listTotal = calcCurrentListTotal();
  const comboPrice = Math.round(parseFloat(priceStr.replace(",", ".")) * 100) || 0;
  const { savings, pct } = calcSavings(listTotal, comboPrice);

  const availableServices = services.filter(
    (s) => !selectedItems.some((i) => i.serviceId === s.id)
  );
  const availableProducts = products.filter(
    (p) => !selectedItems.some((i) => i.productId === p.id)
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.1rem", margin: 0 }}>
          {isEdit ? "Editar Combo" : "Novo Combo"}
        </h2>

        {/* Nome */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Nome *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Combo Noivo"
            style={{
              background: "var(--bg-card-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
            }}
          />
        </div>

        {/* Descricao */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Descricao</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            style={{
              background: "var(--bg-card-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
            }}
          />
        </div>

        {/* Preco + Comissao */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Preco do Combo (R$) *</label>
            <input
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="0,00"
              style={{
                background: "var(--bg-card-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.75rem",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Comissao do Combo (%)</label>
            <input
              value={commissionStr}
              onChange={(e) => setCommissionStr(e.target.value)}
              placeholder="Opcional"
              type="number"
              min="0"
              max="100"
              style={{
                background: "var(--bg-card-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.75rem",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {/* Economia ao vivo */}
        {listTotal > 0 && comboPrice > 0 && (
          <div
            style={{
              background: "var(--bg-card-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.625rem 0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              Lista: <span style={{ textDecoration: "line-through" }}>{formatBRL(listTotal)}</span>
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              Combo: <strong style={{ color: "var(--text-primary)" }}>{formatBRL(comboPrice)}</strong>
            </span>
            {savings > 0 && (
              <span style={{ color: "#22c55e", fontWeight: 600 }}>
                -{formatBRL(savings)} ({pct}%)
              </span>
            )}
          </div>
        )}

        {/* Itens selecionados */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Itens do Combo ({selectedItems.length})
          </label>
          {selectedItems.length === 0 && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", margin: 0 }}>
              Adicione ao menos 1 item abaixo.
            </p>
          )}
          {selectedItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-card-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.4rem 0.75rem",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>
                {getItemLabel(item)}
              </span>
              <span style={{ color: "var(--text-secondary)", marginRight: "0.75rem" }}>
                {formatBRL(getItemPrice(item))}
              </span>
              <button
                onClick={() => removeItem(idx)}
                style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Seletor de componentes */}
        {(availableServices.length > 0 || availableProducts.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Adicionar item</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {availableServices.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addItem("service", s.id)}
                  style={{
                    background: "var(--bg-card-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.375rem",
                    padding: "0.3rem 0.6rem",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {s.name} ({formatBRL(s.priceInCents)})
                </button>
              ))}
              {availableProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem("product", p.id)}
                  style={{
                    background: "var(--bg-card-elevated)",
                    border: "1px solid #C8A24C44",
                    borderRadius: "0.375rem",
                    padding: "0.3rem 0.6rem",
                    color: "#C8A24C",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {p.name} ({formatBRL(p.priceInCents)})
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>
        )}

        {/* Acoes */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: isPending ? "#666" : "#C8102E",
              color: "#fff",
              cursor: isPending ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar Combo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CombosClient ─────────────────────────────────────────────────────────────

export function CombosClient({ data }: { data: CombosData }) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openCreate() {
    setEditingCombo(undefined);
    setShowModal(true);
  }

  function openEdit(combo: Combo) {
    setEditingCombo(combo);
    setShowModal(true);
  }

  function handleToggle(comboId: string) {
    setTogglingId(comboId);
    startTransition(async () => {
      try {
        await toggleComboActive(comboId);
        toast("Status do combo atualizado.", "success");
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Erro ao atualizar combo.",
          "error"
        );
      } finally {
        setTogglingId(null);
      }
    });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.4rem", margin: 0 }}>
            Combos
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
            Pacotes de servicos e produtos com preco unico
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: "#C8102E",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          + Novo Combo
        </button>
      </div>

      {/* Lista */}
      {data.combos.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-tertiary)",
          }}
        >
          Nenhum combo criado ainda. Clique em + Novo Combo para comecar.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data.combos.map((combo) => {
            const listTotal = calcListTotal(combo.items as ComboItemWithDetails[]);
            const { savings, pct } = calcSavings(listTotal, combo.priceInCents);

            return (
              <div
                key={combo.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  opacity: combo.isActive ? 1 : 0.55,
                }}
              >
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                      {combo.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "9999px",
                        background: combo.isActive ? "#16a34a22" : "#6b728022",
                        color: combo.isActive ? "#22c55e" : "var(--text-tertiary)",
                      }}
                    >
                      {combo.isActive ? "Ativo" : "Inativo"}
                    </span>
                    {combo.commissionPercent != null && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          background: "#C8A24C22",
                          color: "#C8A24C",
                        }}
                      >
                        Comissao {combo.commissionPercent}%
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    {combo.items.length} {combo.items.length === 1 ? "item" : "itens"}
                    {combo.description && ` · ${combo.description}`}
                  </div>
                </div>

                {/* Preco e economia */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {listTotal > 0 && (
                    <div style={{ color: "var(--text-tertiary)", fontSize: "0.78rem", textDecoration: "line-through" }}>
                      {formatBRL(listTotal)}
                    </div>
                  )}
                  <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1rem" }}>
                    {formatBRL(combo.priceInCents)}
                  </div>
                  {savings > 0 && (
                    <div style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: 600 }}>
                      -{formatBRL(savings)} ({pct}%)
                    </div>
                  )}
                </div>

                {/* Acoes */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(combo as Combo)}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(combo.id)}
                    disabled={isPending && togglingId === combo.id}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: combo.isActive ? "#ef4444" : "#22c55e",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                    }}
                  >
                    {isPending && togglingId === combo.id
                      ? "..."
                      : combo.isActive
                      ? "Desativar"
                      : "Ativar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ComboModal
          combo={editingCombo}
          services={data.services}
          products={data.products}
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
