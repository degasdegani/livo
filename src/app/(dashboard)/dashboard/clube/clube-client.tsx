"use client";

import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { BarberCommissionMode } from "@prisma/client";
import { SeloAsaas } from "@/components/ui/selo-asaas";
import {
  createPlan,
  updatePlan,
  togglePlanActive,
  getClubData,
  type CreatePlanInput,
  type PlanItemInput,
  type PlanProductDiscountInput,
} from "./actions";

// ─── Tipos derivados do retorno da action ──────────────────────────────────────

type ClubData = Awaited<ReturnType<typeof getClubData>>;
type Plan = ClubData["plans"][number];
type Service = ClubData["services"][number];
type Product = ClubData["products"][number];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function reaisToCents(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

// Economia mensal: soma do preco de tabela (servico x quantidade) menos o preco do plano.
function calcPlanSavings(
  items: { quantityPerCycle: number; priceInCents: number }[],
  planPriceInCents: number,
): number {
  const listTotal = items.reduce(
    (sum, i) => sum + i.priceInCents * i.quantityPerCycle,
    0,
  );
  return listTotal - planPriceInCents;
}

// ─── Estado de formulario do modal ──────────────────────────────────────────────

type FormItem = {
  serviceId: string;
  quantityPerCycle: number;
  barberCommissionStr: string;
};

type DiscountMode = "pct" | "cents";

type FormDiscount = {
  productId: string;
  mode: DiscountMode;
  valueStr: string;
};

// ─── Modal criar/editar ──────────────────────────────────────────────────────────

type ModalProps = {
  plan?: Plan;
  services: Service[];
  products: Product[];
  onClose: () => void;
};

function PlanModal({ plan, services, products, onClose }: ModalProps) {
  const isEdit = !!plan;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [priceStr, setPriceStr] = useState(
    plan ? (plan.priceInCents / 100).toFixed(2) : "",
  );
  const [commissionMode, setCommissionMode] = useState<BarberCommissionMode>(
    plan?.barberCommissionMode ?? BarberCommissionMode.none,
  );
  const [hasMaxSlots, setHasMaxSlots] = useState(plan?.maxSlots != null);
  const [maxSlotsStr, setMaxSlotsStr] = useState(
    plan?.maxSlots != null ? String(plan.maxSlots) : "",
  );

  const [items, setItems] = useState<FormItem[]>(
    plan?.items.map((i) => ({
      serviceId: i.serviceId,
      quantityPerCycle: i.quantityPerCycle,
      barberCommissionStr:
        i.barberCommissionInCents != null
          ? (i.barberCommissionInCents / 100).toFixed(2)
          : "",
    })) ?? [],
  );

  const [discounts, setDiscounts] = useState<FormDiscount[]>(
    plan?.productDiscounts.map((d) => ({
      productId: d.productId,
      mode: d.discountInCents != null ? "cents" : "pct",
      valueStr:
        d.discountInCents != null
          ? (d.discountInCents / 100).toFixed(2)
          : d.discountPct != null
            ? String(d.discountPct)
            : "",
    })) ?? [],
  );

  const [discountsOpen, setDiscountsOpen] = useState(
    (plan?.productDiscounts.length ?? 0) > 0,
  );
  const [error, setError] = useState("");

  // ─── Manipulacao de servicos ──────────────────────────────────────────────────

  function toggleService(serviceId: string) {
    setItems((prev) => {
      const exists = prev.find((i) => i.serviceId === serviceId);
      if (exists) return prev.filter((i) => i.serviceId !== serviceId);
      return [
        ...prev,
        { serviceId, quantityPerCycle: 1, barberCommissionStr: "" },
      ];
    });
  }

  function updateItemQty(serviceId: string, qty: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.serviceId === serviceId
          ? { ...i, quantityPerCycle: Math.max(1, qty) }
          : i,
      ),
    );
  }

  function updateItemCommission(serviceId: string, value: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.serviceId === serviceId ? { ...i, barberCommissionStr: value } : i,
      ),
    );
  }

  // ─── Manipulacao de descontos ─────────────────────────────────────────────────

  function toggleDiscount(productId: string) {
    setDiscounts((prev) => {
      const exists = prev.find((d) => d.productId === productId);
      if (exists) return prev.filter((d) => d.productId !== productId);
      return [...prev, { productId, mode: "pct", valueStr: "" }];
    });
  }

  function updateDiscountMode(productId: string, mode: DiscountMode) {
    setDiscounts((prev) =>
      prev.map((d) => (d.productId === productId ? { ...d, mode } : d)),
    );
  }

  function updateDiscountValue(productId: string, value: string) {
    setDiscounts((prev) =>
      prev.map((d) =>
        d.productId === productId ? { ...d, valueStr: value } : d,
      ),
    );
  }

  // ─── Economia ao vivo ─────────────────────────────────────────────────────────

  const planPriceCents = reaisToCents(priceStr);
  const savings = useMemo(() => {
    const enriched = items.map((i) => {
      const svc = services.find((s) => s.id === i.serviceId);
      return {
        quantityPerCycle: i.quantityPerCycle,
        priceInCents: svc?.priceInCents ?? 0,
      };
    });
    return calcPlanSavings(enriched, planPriceCents);
  }, [items, services, planPriceCents]);

  // ─── Submissao ────────────────────────────────────────────────────────────────

  function buildInput(): CreatePlanInput {
    const planItems: PlanItemInput[] = items.map((i) => ({
      serviceId: i.serviceId,
      quantityPerCycle: i.quantityPerCycle,
      barberCommissionInCents:
        commissionMode === BarberCommissionMode.fixed
          ? reaisToCents(i.barberCommissionStr)
          : null,
    }));

    const productDiscounts: PlanProductDiscountInput[] = discounts.map((d) => ({
      productId: d.productId,
      discountPct: d.mode === "pct" ? parseFloat(d.valueStr) || 0 : null,
      discountInCents: d.mode === "cents" ? reaisToCents(d.valueStr) : null,
    }));

    return {
      name,
      description: description || null,
      priceInCents: planPriceCents,
      barberCommissionMode: commissionMode,
      maxSlots: hasMaxSlots ? parseInt(maxSlotsStr, 10) || null : null,
      items: planItems,
      productDiscounts,
    };
  }

  function handleSubmit() {
    setError("");
    const input = buildInput();

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updatePlan({ ...input, planId: plan.id })
          : await createPlan(input);

        if (result?.error) {
          setError(result.error);
          toast(result.error, "error");
          return;
        }

        toast(isEdit ? "Plano atualizado!" : "Plano criado!", "success");
        onClose();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Erro ao salvar plano.";
        setError(message);
        toast(message, "error");
      }
    });
  }

  const labelStyle: React.CSSProperties = {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  };
  const inputStyle: React.CSSProperties = {
    background: "var(--bg-card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
  };

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
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2
          style={{
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "1.1rem",
            margin: 0,
          }}
        >
          {isEdit ? "Editar Plano" : "Novo Plano"}
        </h2>

        {/* Nome */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={labelStyle}>Nome do plano *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Clube Premium"
            style={inputStyle}
          />
        </div>

        {/* Descricao */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={labelStyle}>Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Preco + Modo de comissao */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <label style={labelStyle}>Preco mensal (R$) *</label>
            <input
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <label style={labelStyle}>Modo de comissao</label>
            <select
              value={commissionMode}
              onChange={(e) =>
                setCommissionMode(e.target.value as BarberCommissionMode)
              }
              style={inputStyle}
            >
              <option value={BarberCommissionMode.none}>Nenhuma</option>
              <option value={BarberCommissionMode.fixed}>
                Valor fixo por atendimento
              </option>
            </select>
          </div>
        </div>

        {/* Vagas limitadas */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label
            style={{
              ...labelStyle,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={hasMaxSlots}
              onChange={(e) => setHasMaxSlots(e.target.checked)}
            />
            Vagas limitadas
          </label>
          {hasMaxSlots && (
            <input
              value={maxSlotsStr}
              onChange={(e) => setMaxSlotsStr(e.target.value)}
              placeholder="Qtd de vagas"
              type="number"
              min="1"
              style={{ ...inputStyle, width: "140px" }}
            />
          )}
        </div>

        {/* Economia ao vivo */}
        {planPriceCents > 0 && items.length > 0 && (
          <div
            style={{
              background: "var(--bg-card-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.625rem 0.75rem",
              fontSize: "0.85rem",
              color:
                savings > 0 ? "#22c55e" : "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            {savings > 0
              ? `Economia de ${formatBRL(savings)}/mes vs avulso`
              : "Sem economia vs avulso neste preco"}
          </div>
        )}

        {/* Servicos incluidos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={labelStyle}>Servicos incluidos *</label>
          {services.length === 0 && (
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: "0.85rem",
                margin: 0,
              }}
            >
              Nenhum servico ativo cadastrado.
            </p>
          )}
          {services.map((s) => {
            const item = items.find((i) => i.serviceId === s.id);
            const included = !!item;
            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: included
                    ? "var(--bg-card-elevated)"
                    : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => toggleService(s.id)}
                    />
                    {s.name}
                  </span>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {formatBRL(s.priceInCents)}
                  </span>
                </label>

                {included && item && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      paddingLeft: "1.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.2rem",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-tertiary)",
                          fontSize: "0.75rem",
                        }}
                      >
                        Qtd/mes
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantityPerCycle}
                        onChange={(e) =>
                          updateItemQty(
                            s.id,
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        style={{ ...inputStyle, width: "90px" }}
                      />
                    </div>
                    {commissionMode === BarberCommissionMode.fixed && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-tertiary)",
                            fontSize: "0.75rem",
                          }}
                        >
                          Comissao (R$)
                        </span>
                        <input
                          inputMode="decimal"
                          placeholder="0,00"
                          value={item.barberCommissionStr}
                          onChange={(e) =>
                            updateItemCommission(s.id, e.target.value)
                          }
                          style={{ ...inputStyle, width: "120px" }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Descontos em produtos (colapsavel) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setDiscountsOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              ...labelStyle,
            }}
          >
            <span>Descontos em produtos ({discounts.length})</span>
            <span>{discountsOpen ? "−" : "+"}</span>
          </button>

          {discountsOpen && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
            >
              {products.length === 0 && (
                <p
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: "0.85rem",
                    margin: 0,
                  }}
                >
                  Nenhum produto cadastrado.
                </p>
              )}
              {products.map((p) => {
                const disc = discounts.find((d) => d.productId === p.id);
                const included = !!disc;
                return (
                  <div
                    key={p.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      background: included
                        ? "var(--bg-card-elevated)"
                        : "transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        color: "var(--text-primary)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleDiscount(p.id)}
                      />
                      {p.name}
                    </label>

                    {included && disc && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          paddingLeft: "1.5rem",
                        }}
                      >
                        <select
                          value={disc.mode}
                          onChange={(e) =>
                            updateDiscountMode(
                              p.id,
                              e.target.value as DiscountMode,
                            )
                          }
                          style={{ ...inputStyle, width: "140px" }}
                        >
                          <option value="pct">% desconto</option>
                          <option value="cents">R$ desconto</option>
                        </select>
                        <input
                          inputMode="decimal"
                          placeholder={disc.mode === "pct" ? "0" : "0,00"}
                          value={disc.valueStr}
                          onChange={(e) =>
                            updateDiscountValue(p.id, e.target.value)
                          }
                          style={{ ...inputStyle, width: "120px" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>
            {error}
          </p>
        )}

        {/* Acoes */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            marginTop: "0.5rem",
          }}
        >
          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: isPending ? "not-allowed" : "pointer",
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
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de plano ────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
  onToggle,
  isToggling,
}: {
  plan: Plan;
  onEdit: () => void;
  onToggle: () => void;
  isToggling: boolean;
}) {
  const savings = calcPlanSavings(
    plan.items.map((i) => ({
      quantityPerCycle: i.quantityPerCycle,
      priceInCents: i.service.priceInCents,
    })),
    plan.priceInCents,
  );

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        opacity: plan.isActive ? 1 : 0.6,
      }}
    >
      {/* Cabecalho do card */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              {plan.name}
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                background: plan.isActive ? "#16a34a22" : "#6b728022",
                color: plan.isActive ? "#22c55e" : "var(--text-tertiary)",
              }}
            >
              {plan.isActive ? "Ativo" : "Inativo"}
            </span>
          </div>
          {plan.description && (
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                margin: "0.25rem 0 0",
              }}
            >
              {plan.description}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            {formatBRL(plan.priceInCents)}/mes
          </div>
          {savings > 0 && (
            <div
              style={{
                color: "#22c55e",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              Economia de {formatBRL(savings)}/mes vs avulso
            </div>
          )}
        </div>
      </div>

      {/* Servicos incluidos */}
      <div>
        <div
          style={{
            color: "var(--text-tertiary)",
            fontSize: "0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          Servicos incluidos
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}
        >
          {plan.items.map((i) => (
            <span
              key={i.id}
              style={{
                fontSize: "0.8rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "9999px",
                background: "var(--bg-card-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {i.service.name} · {i.quantityPerCycle}/mes
            </span>
          ))}
        </div>
      </div>

      {/* Descontos em produtos */}
      {plan.productDiscounts.length > 0 && (
        <div>
          <div
            style={{
              color: "var(--text-tertiary)",
              fontSize: "0.75rem",
              marginBottom: "0.25rem",
            }}
          >
            Descontos em produtos
          </div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}
          >
            {plan.productDiscounts.map((d) => (
              <span
                key={d.id}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "9999px",
                  background: "#C8A24C22",
                  border: "1px solid #C8A24C44",
                  color: "#C8A24C",
                }}
              >
                {d.product.name} ·{" "}
                {d.discountInCents != null
                  ? `${formatBRL(d.discountInCents)} off`
                  : `${d.discountPct ?? 0}% off`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comissao + acoes */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.25rem",
        }}
      >
        <span
          style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}
        >
          {plan.barberCommissionMode === BarberCommissionMode.fixed
            ? "Comissao: fixo por atendimento"
            : "Sem comissao"}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onEdit}
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
            onClick={onToggle}
            disabled={isToggling}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border)",
              background: "transparent",
              color: plan.isActive ? "#ef4444" : "#22c55e",
              cursor: isToggling ? "not-allowed" : "pointer",
              fontSize: "0.82rem",
            }}
          >
            {isToggling ? "..." : plan.isActive ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────────

export function ClubeDashboard({ data }: { data: ClubData }) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openCreate() {
    setEditingPlan(undefined);
    setShowModal(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setShowModal(true);
  }

  function handleToggle(planId: string) {
    setTogglingId(planId);
    startTransition(async () => {
      try {
        const result = await togglePlanActive(planId);
        if (result?.error) {
          toast(result.error, "error");
        } else {
          toast("Status do plano atualizado.", "success");
        }
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Erro ao atualizar plano.",
          "error",
        );
      } finally {
        setTogglingId(null);
      }
    });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Banner clube desativado */}
      {!data.clubEnabled && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            color: "var(--text-secondary)",
            fontSize: "0.88rem",
            lineHeight: 1.5,
          }}
        >
          O Clube de Assinatura esta desativado para esta barbearia. Entre em
          contato com o suporte LIVO para ativar.
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "1.4rem",
              margin: 0,
            }}
          >
            Clube de Assinatura
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              margin: "0.25rem 0 0",
            }}
          >
            Gerencie os planos de assinatura dos seus clientes
          </p>
        </div>
        {data.clubEnabled && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0 }}>
            <a
              href="/dashboard/clube/assinantes"
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Ver assinantes
            </a>
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
              + Novo Plano
            </button>
          </div>
        )}
      </div>

      {/* Lista de planos */}
      {data.plans.length === 0 ? (
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
          Nenhum plano criado ainda.
          {data.clubEnabled
            ? " Clique em + Novo Plano para comecar."
            : ""}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => openEdit(plan)}
              onToggle={() => handleToggle(plan.id)}
              isToggling={isPending && togglingId === plan.id}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PlanModal
          plan={editingPlan}
          services={data.services}
          products={data.products}
          onClose={() => setShowModal(false)}
        />
      )}

      {data.clubEnabled && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", paddingBottom: "24px" }}>
          <SeloAsaas variant="dark" />
        </div>
      )}
    </div>
  );
}
