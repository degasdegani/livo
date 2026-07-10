// src/app/(dashboard)/dashboard/settings/basic-info-form.tsx
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { fetchCEP, maskCEP } from "@/lib/cep";
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
  cep: string;
  street: string;
  neighborhood: string;
}

export function BasicInfoForm({
  name,
  phone,
  city,
  cep,
  street,
  neighborhood,
}: Props) {
  const [state, action] = useActionState(updateBasicInfo, null);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [cepValue, setCepValue] = useState(maskCEP(cep ?? ""));
  const [streetValue, setStreetValue] = useState(street ?? "");
  const [neighborhoodValue, setNeighborhoodValue] = useState(neighborhood ?? "");
  const [cityValue, setCityValue] = useState(city ?? "");
  const [cepLoading, setCepLoading] = useState(false);

  async function handleCEPBlur() {
    const clean = cepValue.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    const data = await fetchCEP(clean);
    if (data) {
      setStreetValue(data.logradouro || streetValue);
      setNeighborhoodValue(data.bairro || neighborhoodValue);
      setCityValue(data.localidade || cityValue);
    }
    setCepLoading(false);
  }

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
            <PhoneInput
              id="basic-phone"
              name="phone"
              label="Telefone"
              value={phoneValue}
              onChange={setPhoneValue}
              placeholder="(16) 99999-9999"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                id="basic-cep"
                name="cep"
                type="text"
                inputMode="numeric"
                label="CEP"
                value={cepValue}
                onChange={(e) => setCepValue(maskCEP(e.target.value))}
                onBlur={handleCEPBlur}
                placeholder="00000-000"
              />
              {cepLoading && (
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  Buscando endereço...
                </p>
              )}
            </div>
            <Input
              id="basic-city"
              name="city"
              type="text"
              label="Cidade"
              value={cityValue}
              onChange={(e) => setCityValue(e.target.value)}
              placeholder="Ribeirao Preto"
            />
            <Input
              id="basic-street"
              name="street"
              type="text"
              label="Rua"
              value={streetValue}
              onChange={(e) => setStreetValue(e.target.value)}
              placeholder="Rua das Flores, 123"
            />
            <Input
              id="basic-neighborhood"
              name="neighborhood"
              type="text"
              label="Bairro"
              value={neighborhoodValue}
              onChange={(e) => setNeighborhoodValue(e.target.value)}
              placeholder="Centro"
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
