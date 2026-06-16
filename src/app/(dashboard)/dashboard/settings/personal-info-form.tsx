// src/app/(dashboard)/dashboard/settings/personal-info-form.tsx
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { updatePersonalInfo } from "./actions";

type PersonalInfoResult = { success?: boolean; error?: string } | null;

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  if (d.length <= 9) return d.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

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
  email: string;
  cpf: string | null;
  birthDate: Date | null;
  phone: string | null;
}

export function PersonalInfoForm({
  name,
  email,
  cpf,
  birthDate,
  phone,
}: Props) {
  const [state, action] = useActionState<PersonalInfoResult, FormData>(
    updatePersonalInfo,
    null,
  );
  const [cpfValue, setCpfValue] = useState(cpf ? maskCPF(cpf) : "");
  const [phoneValue, setPhoneValue] = useState(phone ? maskPhone(phone) : "");

  const birthDateFormatted = birthDate
    ? new Date(birthDate).toISOString().split("T")[0]
    : "";

  return (
    <form
      action={action}
      className="p-6 flex flex-col gap-4"
      style={{ backgroundColor: "var(--bg-card-elevated)" }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Nome completo *"
            name="name"
            type="text"
            defaultValue={name}
            required
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-primary)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
        </div>

        <div className="sm:col-span-2">
          <Input
            label="E-mail"
            type="email"
            value={email}
            disabled
            readOnly
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            E-mail não pode ser alterado
          </p>
        </div>

        <Input
          label="CPF"
          name="cpf"
          type="text"
          inputMode="numeric"
          value={cpfValue}
          onChange={(e) => setCpfValue(maskCPF(e.target.value))}
          placeholder="000.000.000-00"
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-primary)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        />

        <Input
          label="Data de nascimento"
          name="birthDate"
          type="date"
          defaultValue={birthDateFormatted}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-primary)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        />

        <div className="sm:col-span-2">
          <Input
            label="Celular"
            name="phone"
            type="tel"
            value={phoneValue}
            onChange={(e) => setPhoneValue(maskPhone(e.target.value))}
            placeholder="(16) 99999-9999"
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-primary)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
        </div>
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
          ✓ Dados pessoais salvos com sucesso.
        </p>
      )}

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
