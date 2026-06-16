// src/app/(dashboard)/dashboard/settings/basic-info-form.tsx
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { maskPhone } from "@/lib/masks";
import { updateBasicInfo } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

interface Props {
  name: string;
  phone: string;
  city: string;
}

export function BasicInfoForm({ name, phone, city }: Props) {
  const [state, action] = useActionState(updateBasicInfo, null);
  const [phoneValue, setPhoneValue] = useState(maskPhone(phone));

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="px-6 py-4"
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <p
          className="font-bold text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          Informações básicas
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          Aparece na página pública da barbearia
        </p>
      </div>

      <form
        action={action}
        style={{ backgroundColor: "var(--bg-card-elevated)" }}
      >
        <div className="p-6 flex flex-col gap-4">
          <Input
            id="basic-name"
            name="name"
            type="text"
            label="Nome da barbearia"
            required
            defaultValue={name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="basic-phone"
              name="phone"
              type="tel"
              label="Telefone"
              value={phoneValue}
              onChange={(e) => setPhoneValue(maskPhone(e.target.value))}
              placeholder="(16) 99999-9999"
            />
            <Input
              id="basic-city"
              name="city"
              type="text"
              label="Cidade"
              defaultValue={city}
              placeholder="Ribeirao Preto"
            />
          </div>

          {state?.error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                color: "var(--color-primary)",
                backgroundColor: "var(--color-primary-10)",
              }}
            >
              {state.error}
            </p>
          )}
          {state?.success && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                color: "var(--status-green)",
                backgroundColor: "rgba(0,212,160,0.08)",
              }}
            >
              <Check size={14} className="inline mr-1" />Informações salvas com sucesso.
            </p>
          )}

          <div className="flex justify-end">
            <SaveButton />
          </div>
        </div>
      </form>
    </section>
  );
}
