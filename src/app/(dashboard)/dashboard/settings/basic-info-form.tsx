"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateBasicInfo } from "./actions";

// Formata o telefone enquanto o usuário digita
// "16999999999" → "(16) 99999-9999"
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, "($1");
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
      style={{ background: "#FF2D55" }}
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
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="px-6 py-4"
        style={{
          background: "#0A0A0A",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="font-bold text-white text-sm">Informações básicas</p>
        <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
          Aparece na página pública da barbearia
        </p>
      </div>

      <form action={action} style={{ background: "#080808" }}>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Nome da barbearia *
            </label>
            <input
              name="name"
              type="text"
              defaultValue={name}
              required
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Telefone
              </label>
              <input
                name="phone"
                type="tel"
                value={phoneValue}
                onChange={(e) => setPhoneValue(maskPhone(e.target.value))}
                placeholder="(16) 99999-9999"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Cidade
              </label>
              <input
                name="city"
                type="text"
                defaultValue={city}
                placeholder="Ribeirao Preto"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>
          </div>

          {state?.error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
            >
              {state.error}
            </p>
          )}
          {state?.success && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: "#00D4A0", background: "rgba(0,212,160,0.08)" }}
            >
              ✓ Informações salvas com sucesso.
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
