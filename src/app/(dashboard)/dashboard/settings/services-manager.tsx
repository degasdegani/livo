"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  addService,
  deleteService,
  toggleServiceActive,
  updateService,
} from "./actions";

// ── Máscara de moeda brasileira ───────────────────────────────
// Funciona como caixa registradora: começa em 0,00
// Digitar "35" → "0,35" → "3,50" → "35,00"
function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits || digits === "0") return "0,00";
  const amount = parseInt(digits, 10);
  return (amount / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Exibe preço formatado na lista (centavos → "35,00")
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-xl font-bold text-xs text-white transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: "#FF2D55" }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

// ── Formulário de adição (componente separado para state próprio)
function AddServiceForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action] = useActionState(addService, null);
  const [price, setPrice] = useState("0,00");

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state]);

  return (
    <form
      action={action}
      className="p-6"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-xs font-bold mb-4" style={{ color: "#A1A1AA" }}>
        Novo serviço
      </p>
      <div className="flex flex-col gap-3">
        <input
          name="name"
          type="text"
          placeholder="Nome do serviço"
          required
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "#52525B" }}>
              Duração (min)
            </label>
            <input
              name="duration"
              type="number"
              placeholder="30"
              min="5"
              defaultValue="30"
              required
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#52525B" }}>
              Preço (R$)
            </label>
            <input
              name="price"
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(maskCurrency(e.target.value))}
              required
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none text-right"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>
        {state?.error && (
          <p className="text-xs" style={{ color: "#FF2D55" }}>
            {state.error}
          </p>
        )}
        <div className="flex justify-end">
          <SubmitButton
            label="Adicionar serviço"
            pendingLabel="Adicionando..."
          />
        </div>
      </div>
    </form>
  );
}

// ── Formulário de edição (componente separado para state próprio)
function EditServiceForm({
  service,
  onSuccess,
  onCancel,
}: {
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceInCents: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(updateService, null);
  // Inicializa já formatado corretamente (centavos → "35,00")
  const [price, setPrice] = useState(formatPrice(service.priceInCents));

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state]);

  return (
    <form action={action} className="p-4">
      <input type="hidden" name="serviceId" value={service.id} />
      <div className="flex flex-col gap-3">
        <input
          name="name"
          type="text"
          defaultValue={service.name}
          required
          className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "#52525B" }}>
              Duração (min)
            </label>
            <input
              name="duration"
              type="number"
              defaultValue={service.durationMin}
              min="5"
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#52525B" }}>
              Preço (R$)
            </label>
            <input
              name="price"
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(maskCurrency(e.target.value))}
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none text-right"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>
        {state?.error && (
          <p className="text-xs" style={{ color: "#FF2D55" }}>
            {state.error}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold hover:opacity-70"
            style={{ color: "#52525B" }}
          >
            Cancelar
          </button>
          <SubmitButton label="Salvar" pendingLabel="Salvando..." />
        </div>
      </div>
    </form>
  );
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceInCents: number;
  isActive: boolean;
}

export function ServicesManager({ services }: { services: Service[] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(serviceId: string) {
    startTransition(async () => {
      await toggleServiceActive(serviceId);
    });
  }

  function handleDelete(serviceId: string) {
    if (!confirm("Excluir este serviço? Esta ação não pode ser desfeita."))
      return;
    startTransition(async () => {
      await deleteService(serviceId);
    });
  }

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: "#0A0A0A",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <p className="font-bold text-white text-sm">Serviços</p>
          <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
            {services.filter((s) => s.isActive).length} ativos ·{" "}
            {services.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
          }}
          className="px-3 py-1.5 rounded-xl font-bold text-xs transition-all hover:opacity-80"
          style={{
            background: showAddForm
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,45,85,0.1)",
            color: showAddForm ? "#52525B" : "#FF2D55",
            border: showAddForm
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(255,45,85,0.2)",
          }}
        >
          {showAddForm ? "Cancelar" : "+ Adicionar serviço"}
        </button>
      </div>

      <div style={{ background: "#080808" }}>
        {/* Formulário de adição */}
        {showAddForm && (
          <AddServiceForm onSuccess={() => setShowAddForm(false)} />
        )}

        {/* Lista de serviços */}
        {services.length === 0 ? (
          <p
            className="px-6 py-8 text-center text-sm"
            style={{ color: "#52525B" }}
          >
            Nenhum serviço cadastrado.
          </p>
        ) : (
          services.map((service, i) => (
            <div
              key={service.id}
              style={{
                borderBottom:
                  i < services.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : undefined,
              }}
            >
              {editingId === service.id ? (
                <EditServiceForm
                  service={service}
                  onSuccess={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ opacity: service.isActive ? 1 : 0.4 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">
                      {service.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
                      {service.durationMin} min · R${" "}
                      {formatPrice(service.priceInCents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(service.id);
                        setShowAddForm(false);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70"
                      style={{
                        color: "#A1A1AA",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(service.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70 disabled:opacity-50"
                      style={{
                        background: service.isActive
                          ? "rgba(0,212,160,0.08)"
                          : "rgba(255,255,255,0.04)",
                        color: service.isActive ? "#00D4A0" : "#52525B",
                      }}
                    >
                      {service.isActive ? "Ativo" : "Inativo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70 disabled:opacity-50"
                      style={{
                        background: "rgba(255,45,85,0.08)",
                        color: "#FF2D55",
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
