"use client";

import { useState, useTransition } from "react";
import { createBarbershop } from "./actions";
import { PRESET_SERVICES } from "./data";

// ─── Máscaras ──────────────────────────────────────────────────────────────────

function maskCelular(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskTelefoneFixo(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Estilos reutilizáveis ─────────────────────────────────────────────────────

const inputClass =
  "w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-[#3F3F46]";

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "#FF2D55";
}

function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "rgba(255,255,255,0.08)";
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Dados do dono
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [celular, setCelular] = useState("");

  // Dados da barbearia
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [city, setCity] = useState("");

  // Endereço opcional
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cep, setCep] = useState("");
  const [telefoneFixo, setTelefoneFixo] = useState("");

  // Serviços
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "Corte Social",
    "Corte + Barba",
    "Barba Completa",
  ]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(toSlug(value));
  }

  function toggleService(serviceName: string) {
    setSelectedServices((prev) =>
      prev.includes(serviceName)
        ? prev.filter((s) => s !== serviceName)
        : [...prev, serviceName],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validações do lado cliente
    if (!fullName.trim() || fullName.trim().split(" ").length < 2) {
      setError("Informe seu nome completo (nome e sobrenome).");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setError("CPF inválido. Informe os 11 dígitos.");
      return;
    }
    if (!birthDate) {
      setError("Informe sua data de nascimento.");
      return;
    }
    if (celular.replace(/\D/g, "").length !== 11) {
      setError("Celular inválido. Informe DDD + 9 dígitos.");
      return;
    }

    startTransition(async () => {
      const result = await createBarbershop({
        name,
        slug,
        city,
        celular,
        fullName,
        cpf: cpf.replace(/\D/g, ""),
        birthDate,
        street,
        neighborhood,
        cep: cep.replace(/\D/g, ""),
        telefoneFixo: telefoneFixo.replace(/\D/g, "") || undefined,
        selectedServices,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
              boxShadow: "0 0 12px rgba(255,45,85,0.6)",
            }}
          />
          <span
            className="font-black text-white"
            style={{ fontSize: "20px", letterSpacing: "-0.5px" }}
          >
            Livo
          </span>
        </div>
        <h1
          className="font-black text-white mb-2"
          style={{
            fontSize: "clamp(28px, 5vw, 40px)",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Vamos configurar
          <br />
          <span style={{ color: "#FF2D55" }}>sua barbearia.</span>
        </h1>
        <p style={{ color: "#52525B", fontSize: "15px" }}>
          Leva menos de 2 minutos. Pode alterar tudo depois.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── Bloco 1: Dados do dono ─────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <p className="font-bold text-white mb-1 text-sm">Seus dados</p>
            <p style={{ color: "#52525B", fontSize: "12px" }}>
              Informações do responsável pela barbearia
            </p>
          </div>

          {/* Nome completo */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Nome completo *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="João da Silva"
              required
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* CPF + Data de nascimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                CPF *
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                required
                inputMode="numeric"
                className={inputClass}
                style={{ ...inputStyle }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Data de nascimento *
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className={inputClass}
                style={{
                  ...inputStyle,
                  colorScheme: "dark",
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* Celular */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Celular *
            </label>
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(maskCelular(e.target.value))}
              placeholder="(16) 99999-9999"
              required
              inputMode="numeric"
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* ── Bloco 2: Dados da barbearia ────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <p className="font-bold text-white mb-1 text-sm">
              Informações básicas
            </p>
            <p style={{ color: "#52525B", fontSize: "12px" }}>
              Como sua barbearia aparece para os clientes
            </p>
          </div>

          {/* Nome da barbearia */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Nome da barbearia *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Barbearia do João"
              required
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Slug */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Endereço público *
            </label>
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span
                className="px-3 py-3 text-xs shrink-0"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  color: "#3F3F46",
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                livobarber.com.br/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="barbearia-do-joao"
                required
                className="flex-1 px-3 py-3 text-sm text-white outline-none bg-transparent placeholder:text-[#3F3F46]"
                onFocus={(e) => {
                  const p = e.target.parentElement;
                  if (p) p.style.borderColor = "#FF2D55";
                }}
                onBlur={(e) => {
                  const p = e.target.parentElement;
                  if (p) p.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: "#3F3F46" }}>
              Seus clientes vão usar esse endereço para agendar
            </p>
          </div>

          {/* Cidade */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Cidade (opcional)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ribeirão Preto"
              className={inputClass}
              style={{ ...inputStyle }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* ── Bloco 3: Endereço e telefone fixo (opcional) ───────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <p className="font-bold text-white mb-1 text-sm">
              Endereço e contato{" "}
              <span style={{ color: "#52525B", fontWeight: 400 }}>
                (opcional)
              </span>
            </p>
            <p style={{ color: "#52525B", fontSize: "12px" }}>
              Pode preencher depois nas configurações
            </p>
          </div>

          {/* Rua + Bairro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Rua
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Rua das Flores, 123"
                className={inputClass}
                style={{ ...inputStyle }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Bairro
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Centro"
                className={inputClass}
                style={{ ...inputStyle }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* CEP + Telefone fixo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                CEP
              </label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(maskCEP(e.target.value))}
                placeholder="00000-000"
                inputMode="numeric"
                className={inputClass}
                style={{ ...inputStyle }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Telefone fixo
              </label>
              <input
                type="tel"
                value={telefoneFixo}
                onChange={(e) =>
                  setTelefoneFixo(maskTelefoneFixo(e.target.value))
                }
                placeholder="(16) 3333-4444"
                inputMode="numeric"
                className={inputClass}
                style={{ ...inputStyle }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>
        </div>

        {/* ── Bloco 4: Serviços ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>
            <p className="font-bold text-white mb-1 text-sm">Seus serviços</p>
            <p style={{ color: "#52525B", fontSize: "12px" }}>
              Selecione os que sua barbearia oferece. Pode adicionar mais
              depois.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_SERVICES.map((service) => {
              const isSelected = selectedServices.includes(service.name);
              return (
                <button
                  key={service.name}
                  type="button"
                  onClick={() => toggleService(service.name)}
                  className="flex items-center justify-between p-4 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: isSelected
                      ? "rgba(255,45,85,0.08)"
                      : "rgba(255,255,255,0.02)",
                    border: isSelected
                      ? "1px solid rgba(255,45,85,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: isSelected ? "#FFFFFF" : "#A1A1AA" }}
                    >
                      {service.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: isSelected ? "#A1A1AA" : "#3F3F46" }}
                    >
                      {service.durationMin} min · R${" "}
                      {(service.priceInCents / 100)
                        .toFixed(2)
                        .replace(".", ",")}
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 ml-3"
                    style={{
                      width: 20,
                      height: 20,
                      fontSize: "11px",
                      background: isSelected
                        ? "#FF2D55"
                        : "rgba(255,255,255,0.06)",
                      border: isSelected
                        ? "none"
                        : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {isSelected && <span style={{ color: "#fff" }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedServices.length > 0 && (
            <p className="text-xs" style={{ color: "#52525B" }}>
              {selectedServices.length} serviço
              {selectedServices.length > 1 ? "s" : ""} selecionado
              {selectedServices.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-center"
            style={{
              background: "rgba(255,45,85,0.08)",
              color: "#FF2D55",
              border: "1px solid rgba(255,45,85,0.2)",
            }}
          >
            {error}
          </div>
        )}

        {/* Botão */}
        <button
          type="submit"
          disabled={
            isPending || !name || !slug || selectedServices.length === 0
          }
          className="w-full py-4 rounded-xl font-black text-white text-base transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "#FF2D55",
            boxShadow: "0 8px 32px rgba(255,45,85,0.3)",
            letterSpacing: "-0.3px",
          }}
        >
          {isPending ? "Criando sua barbearia..." : "Criar minha barbearia →"}
        </button>

        <p className="text-center text-xs" style={{ color: "#3F3F46" }}>
          Todas as configurações podem ser alteradas depois nas Configurações
        </p>
      </form>
    </div>
  );
}
