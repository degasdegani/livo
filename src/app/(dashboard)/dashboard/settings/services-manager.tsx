// src/app/(dashboard)/dashboard/settings/services-manager.tsx
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import {
  addService,
  deleteService,
  toggleServiceActive,
  updateService,
} from "./actions";

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
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function AddServiceForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action] = useActionState(addService, null);
  const [priceInCents, setPriceInCents] = useState(0);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form
      action={action}
      className="p-6"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <p
        className="text-xs font-bold mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        Novo serviço
      </p>
      <div className="flex flex-col gap-3">
        <Input name="name" type="text" placeholder="Nome do serviço" required />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duração (min)"
            name="duration"
            type="number"
            placeholder="30"
            min="5"
            defaultValue="30"
            required
          />
          <CurrencyInput
            label="Preço"
            name="price"
            valueInCents={priceInCents}
            onChange={setPriceInCents}
            required
            style={{ textAlign: "right", fontFamily: "monospace" }}
          />
        </div>
        {state?.error && (
          <p className="text-xs" style={{ color: "var(--color-primary)" }}>
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
  const [priceInCents, setPriceInCents] = useState(service.priceInCents);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={action} className="p-4">
      <input type="hidden" name="serviceId" value={service.id} />
      <div className="flex flex-col gap-3">
        <Input name="name" type="text" defaultValue={service.name} required />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duração (min)"
            name="duration"
            type="number"
            defaultValue={service.durationMin}
            min="5"
            required
          />
          <CurrencyInput
            label="Preço"
            name="price"
            valueInCents={priceInCents}
            onChange={setPriceInCents}
            required
            style={{ textAlign: "right", fontFamily: "monospace" }}
          />
        </div>
        {state?.error && (
          <p className="text-xs" style={{ color: "var(--color-primary)" }}>
            {state.error}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold hover:opacity-70"
            style={{ color: "var(--text-tertiary)" }}
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
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="font-bold text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            Serviços
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
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
          style={
            showAddForm
              ? {
                  backgroundColor: "var(--bg-card-elevated)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border)",
                }
              : {
                  backgroundColor: "var(--color-primary-10)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-20)",
                }
          }
        >
          {showAddForm ? "Cancelar" : "+ Adicionar serviço"}
        </button>
      </div>

      <div style={{ backgroundColor: "var(--bg-card-elevated)" }}>
        {showAddForm && (
          <AddServiceForm onSuccess={() => setShowAddForm(false)} />
        )}

        {services.length === 0 ? (
          <p
            className="px-6 py-8 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
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
                    ? "1px solid var(--border)"
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
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {service.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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
                        color: "var(--text-secondary)",
                        backgroundColor: "var(--bg-card)",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(service.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70 disabled:opacity-50"
                      style={
                        service.isActive
                          ? {
                              backgroundColor: "rgba(0,212,160,0.08)",
                              color: "var(--status-green)",
                            }
                          : {
                              backgroundColor: "var(--bg-card)",
                              color: "var(--text-tertiary)",
                            }
                      }
                    >
                      {service.isActive ? "Ativo" : "Inativo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-70 disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--color-primary-10)",
                        color: "var(--color-primary)",
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
