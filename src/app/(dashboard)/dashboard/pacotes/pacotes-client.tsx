"use client";

import { useCallback, useState, useTransition } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/toast";
import {
  searchClientsForAgenda,
  type AgendaClientResult,
} from "../agenda/agenda-actions";
import {
  createPackage,
  updatePackage,
  togglePackageActive,
  sellPackageToClient,
  markPackagePaid,
  getPackagesData,
  type PackageFormData,
  type PackageItemInput,
} from "./actions";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Service = { id: string; name: string; priceInCents: number };

type PackageItemWithDetails = {
  id: string;
  serviceId: string;
  quantity: number;
  service: {
    id: string;
    name: string;
    priceInCents: number;
    isActive: boolean;
  } | null;
};

type Package = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  validityDays: number | null;
  commissionPercent: number | null;
  isActive: boolean;
  items: PackageItemWithDetails[];
};

type PackagesData = Awaited<ReturnType<typeof getPackagesData>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcListTotal(items: PackageItemWithDetails[]): number {
  return items.reduce((sum, item) => {
    const price = item.service?.priceInCents ?? 0;
    const qty = item.quantity > 0 ? item.quantity : 1;
    return sum + price * qty;
  }, 0);
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calcSavings(listTotal: number, packagePrice: number) {
  const savings = listTotal - packagePrice;
  const pct = listTotal > 0 ? Math.round((savings / listTotal) * 100) : 0;
  return { savings, pct };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalProps = {
  pkg?: Package;
  services: Service[];
  onClose: () => void;
  onSuccess: () => void;
};

function PackageModal({ pkg, services, onClose, onSuccess }: ModalProps) {
  const isEdit = !!pkg;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [priceInCents, setPriceInCents] = useState(pkg?.priceInCents ?? 0);
  const [validityStr, setValidityStr] = useState(
    pkg?.validityDays != null ? String(pkg.validityDays) : ""
  );
  const [commissionStr, setCommissionStr] = useState(
    pkg?.commissionPercent != null ? String(pkg.commissionPercent) : ""
  );
  const [selectedItems, setSelectedItems] = useState<PackageItemInput[]>(
    pkg?.items.map((i) => ({
      serviceId: i.serviceId,
      quantity: i.quantity > 0 ? i.quantity : 1,
    })) ?? []
  );
  const [error, setError] = useState("");

  // Preco de lista atual (avulso) ponderado por quantity.
  function calcCurrentListTotal(): number {
    return selectedItems.reduce((sum, item) => {
      const qty = item.quantity ?? 1;
      const svc = services.find((s) => s.id === item.serviceId);
      return sum + (svc?.priceInCents ?? 0) * qty;
    }, 0);
  }

  // Permite o mesmo servico mais de uma vez (sem trava de duplicata).
  function addItem(serviceId: string) {
    setSelectedItems((prev) => [...prev, { serviceId, quantity: 1 }]);
  }

  function removeItem(index: number) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, delta: number) {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const current = item.quantity ?? 1;
        const next = Math.max(1, current + delta);
        return { ...item, quantity: next };
      })
    );
  }

  function getItemLabel(item: PackageItemInput): string {
    return services.find((s) => s.id === item.serviceId)?.name ?? "Servico";
  }

  function getItemPrice(item: PackageItemInput): number {
    return services.find((s) => s.id === item.serviceId)?.priceInCents ?? 0;
  }

  function handleSubmit() {
    setError("");

    const validityDays =
      validityStr.trim() !== "" ? parseInt(validityStr, 10) : null;
    const commissionPercent =
      commissionStr.trim() !== "" ? parseFloat(commissionStr) : null;

    const formData: PackageFormData = {
      name,
      description: description || null,
      priceInCents,
      validityDays,
      commissionPercent,
      items: selectedItems,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updatePackage(pkg.id, formData)
        : await createPackage(formData);

      if (result?.error) {
        setError(result.error);
        toast(result.error, "error");
        return;
      }

      toast(isEdit ? "Pacote atualizado!" : "Pacote criado!", "success");
      onSuccess();
      onClose();
    });
  }

  const listTotal = calcCurrentListTotal();
  const packagePrice = priceInCents;
  const { savings, pct } = calcSavings(listTotal, packagePrice);

  const availableServices = services;

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
          {isEdit ? "Editar Pacote" : "Novo Pacote"}
        </h2>

        {/* Nome */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Nome *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pacote 5 Cortes"
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
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Preco do Pacote *</label>
            <CurrencyInput
              valueInCents={priceInCents}
              onChange={setPriceInCents}
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
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Comissao (%)</label>
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

        {/* Validade */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Validade (dias)
          </label>
          <input
            value={validityStr}
            onChange={(e) => setValidityStr(e.target.value)}
            placeholder="Opcional — deixe vazio para nao expirar"
            type="number"
            min="1"
            step="1"
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

        {/* Economia ao vivo */}
        {listTotal > 0 && packagePrice > 0 && (
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
              Pacote: <strong style={{ color: "var(--text-primary)" }}>{formatBRL(packagePrice)}</strong>
            </span>
            {savings > 0 && (
              <span style={{ color: "#22c55e", fontWeight: 600 }}>
                -{formatBRL(savings)} ({pct}%)
              </span>
            )}
          </div>
        )}

        {/* Servicos selecionados */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Servicos do Pacote ({selectedItems.length})
          </label>
          {selectedItems.length === 0 && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", margin: 0 }}>
              Adicione ao menos 1 servico abaixo.
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
              <span style={{ color: "var(--text-primary)", flex: 1, minWidth: 0 }}>
                {getItemLabel(item)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => updateQuantity(idx, -1)}
                  disabled={(item.quantity ?? 1) <= 1}
                  aria-label="Diminuir quantidade"
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    cursor: (item.quantity ?? 1) <= 1 ? "not-allowed" : "pointer",
                    opacity: (item.quantity ?? 1) <= 1 ? 0.5 : 1,
                    lineHeight: 1,
                  }}
                >
                  -
                </button>
                <span style={{ color: "var(--text-primary)", minWidth: "1.25rem", textAlign: "center" }}>
                  {item.quantity ?? 1}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(idx, 1)}
                  aria-label="Aumentar quantidade"
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>
              <span style={{ color: "var(--text-secondary)", marginRight: "0.75rem" }}>
                {formatBRL(getItemPrice(item) * (item.quantity ?? 1))}
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

        {/* Seletor de servicos */}
        {availableServices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Adicionar servico</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {availableServices.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addItem(s.id)}
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
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar Pacote"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SellModal — venda manual (Etapa 3) ───────────────────────────────────────

function SellModal({ pkg, onClose }: { pkg: Package; onClose: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Autocomplete de cliente — reusa searchClientsForAgenda (nao duplica busca).
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<AgendaClientResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<AgendaClientResult | null>(null);
  const [searchPending, setSearchPending] = useState(false);

  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [error, setError] = useState("");

  // Estado pos-venda: mantem os dois passos discretos (vender -> marcar pago).
  const [soldId, setSoldId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const searchClients = useCallback(async (term: string) => {
    setClientSearch(term);
    setSelectedClient(null);
    if (term.trim().length < 2) {
      setClientResults([]);
      return;
    }
    setSearchPending(true);
    const results = await searchClientsForAgenda(term);
    setClientResults(results);
    setSearchPending(false);
  }, []);

  function handleSell() {
    setError("");
    if (!selectedClient) {
      setError("Selecione um cliente.");
      return;
    }
    startTransition(async () => {
      const result = await sellPackageToClient({
        packageId: pkg.id,
        clientId: selectedClient.id,
        paymentDueDate: paymentDueDate || null,
      });
      if (result?.error) {
        setError(result.error);
        toast(result.error, "error");
        return;
      }
      setSoldId(result.clientPackageId ?? null);
      toast("Pacote vendido! Pagamento pendente.", "success");
    });
  }

  function handleMarkPaid() {
    if (!soldId) return;
    startTransition(async () => {
      const result = await markPackagePaid(soldId);
      if (result?.error) {
        toast(result.error, "error");
        return;
      }
      setPaid(true);
      toast("Pagamento registrado!", "success");
    });
  }

  const included = pkg.items
    .map((i) => {
      const name = i.service?.name ?? "Servico";
      return i.quantity > 1 ? `${name} x${i.quantity}` : name;
    })
    .join(", ");

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
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.1rem", margin: 0 }}>
          Vender Pacote
        </h2>

        {/* Resumo do que sera vendido */}
        <div
          style={{
            background: "var(--bg-card-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{pkg.name}</span>
            <strong style={{ color: "var(--text-primary)" }}>{formatBRL(pkg.priceInCents)}</strong>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{included}</span>
          {pkg.validityDays != null && (
            <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
              Validade: {pkg.validityDays} dias a partir da venda
            </span>
          )}
        </div>

        {soldId ? (
          // ── Pos-venda: oferece marcar pago (passo separado) ──────────────
          <>
            <div
              style={{
                background: paid ? "#16a34a18" : "var(--bg-card-elevated)",
                border: `1px solid ${paid ? "#22c55e55" : "var(--border)"}`,
                borderRadius: "0.5rem",
                padding: "0.75rem",
                color: paid ? "#22c55e" : "var(--text-secondary)",
                fontSize: "0.85rem",
              }}
            >
              {paid
                ? "Venda registrada e paga."
                : "Venda registrada com pagamento PENDENTE."}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              {!paid && (
                <button
                  onClick={handleMarkPaid}
                  disabled={isPending}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: isPending ? "#666" : "#16a34a",
                    color: "#fff",
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  {isPending ? "..." : "Marcar como pago agora"}
                </button>
              )}
              <button
                onClick={onClose}
                disabled={isPending}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Concluir
              </button>
            </div>
          </>
        ) : (
          // ── Formulario de venda ──────────────────────────────────────────
          <>
            {/* Cliente */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Cliente *</label>
              {selectedClient ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-card-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 0.75rem",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "var(--text-primary)", fontSize: "0.9rem" }}>
                      {selectedClient.name}
                    </div>
                    <div style={{ color: "var(--text-tertiary)", fontSize: "0.78rem" }}>
                      {selectedClient.phone}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearch("");
                      setClientResults([]);
                    }}
                    style={{
                      color: "#ef4444",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                    }}
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={clientSearch}
                    onChange={(e) => searchClients(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    style={{
                      background: "var(--bg-card-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                    }}
                  />
                  {searchPending && (
                    <span style={{ color: "var(--text-tertiary)", fontSize: "0.78rem" }}>Buscando...</span>
                  )}
                  {clientResults.length > 0 && (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {clientResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClient(c);
                            setClientResults([]);
                          }}
                          style={{
                            textAlign: "left",
                            background: "var(--bg-card)",
                            border: "none",
                            borderBottom: "1px solid var(--border)",
                            padding: "0.5rem 0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>{c.name}</div>
                          <div style={{ color: "var(--text-tertiary)", fontSize: "0.76rem" }}>{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {clientSearch.trim().length >= 2 &&
                    !searchPending &&
                    clientResults.length === 0 && (
                      <span style={{ color: "var(--text-tertiary)", fontSize: "0.78rem" }}>
                        Nenhum cliente encontrado. Cadastre o cliente antes de vender.
                      </span>
                    )}
                </>
              )}
            </div>

            {/* Data de pagamento (opcional) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Data de pagamento (opcional)
              </label>
              <input
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                type="date"
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

            {error && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>
            )}

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
                onClick={handleSell}
                disabled={isPending || !selectedClient}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: isPending || !selectedClient ? "#666" : "#C8102E",
                  color: "#fff",
                  cursor: isPending || !selectedClient ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                {isPending ? "Vendendo..." : "Confirmar venda"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PacotesClient ─────────────────────────────────────────────────────────────

export function PacotesClient({ data }: { data: PackagesData }) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | undefined>(undefined);
  const [sellingPackage, setSellingPackage] = useState<Package | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openCreate() {
    setEditingPackage(undefined);
    setShowModal(true);
  }

  function openEdit(pkg: Package) {
    setEditingPackage(pkg);
    setShowModal(true);
  }

  function handleCopyLink() {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://livobarber.com.br";
    const publicUrl = `${base}/${data.slug}/pacotes`;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => toast("Link copiado!", "success"))
      .catch(() => toast("Nao foi possivel copiar o link.", "error"));
  }

  function handleToggle(packageId: string) {
    setTogglingId(packageId);
    startTransition(async () => {
      const result = await togglePackageActive(packageId);
      if (result?.error) {
        toast(result.error, "error");
      } else {
        toast("Status do pacote atualizado.", "success");
      }
      setTogglingId(null);
    });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.4rem", margin: 0 }}>
            Pacotes
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0 0" }}>
            Pacotes de servicos pre-pagos com saldo que o cliente consome ao longo do tempo
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleCopyLink}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Copiar link
          </button>
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
            + Novo Pacote
          </button>
        </div>
      </div>

      {/* Lista */}
      {data.packages.length === 0 ? (
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
          Nenhum pacote criado ainda. Clique em + Novo Pacote para comecar.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data.packages.map((pkg) => {
            const items = pkg.items as PackageItemWithDetails[];
            const listTotal = calcListTotal(items);
            const { savings, pct } = calcSavings(listTotal, pkg.priceInCents);

            return (
              <div
                key={pkg.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  opacity: pkg.isActive ? 1 : 0.55,
                }}
              >
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                      {pkg.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "9999px",
                        background: pkg.isActive ? "#16a34a22" : "#6b728022",
                        color: pkg.isActive ? "#22c55e" : "var(--text-tertiary)",
                      }}
                    >
                      {pkg.isActive ? "Ativo" : "Inativo"}
                    </span>
                    {pkg.validityDays != null && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          background: "var(--bg-card-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Validade {pkg.validityDays} dias
                      </span>
                    )}
                    {pkg.commissionPercent != null && (
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
                        Comissao {pkg.commissionPercent}%
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    {pkg.items.length} {pkg.items.length === 1 ? "servico" : "servicos"}
                    {pkg.description && ` · ${pkg.description}`}
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
                    {formatBRL(pkg.priceInCents)}
                  </div>
                  {savings > 0 && (
                    <div style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: 600 }}>
                      -{formatBRL(savings)} ({pct}%)
                    </div>
                  )}
                </div>

                {/* Acoes */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {pkg.isActive && (
                    <button
                      onClick={() => setSellingPackage(pkg as Package)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "none",
                        background: "#16a34a",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    >
                      Vender
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(pkg as Package)}
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
                    onClick={() => handleToggle(pkg.id)}
                    disabled={isPending && togglingId === pkg.id}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: pkg.isActive ? "#ef4444" : "#22c55e",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                    }}
                  >
                    {isPending && togglingId === pkg.id
                      ? "..."
                      : pkg.isActive
                      ? "Desativar"
                      : "Ativar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <PackageModal
          pkg={editingPackage}
          services={data.services}
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      )}

      {/* Modal de venda */}
      {sellingPackage && (
        <SellModal
          pkg={sellingPackage}
          onClose={() => setSellingPackage(undefined)}
        />
      )}
    </div>
  );
}
