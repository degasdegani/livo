"use client";

import { useState, useTransition } from "react";
import { createBarbershop } from "./actions";
import { PRESET_SERVICES } from "./data";

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

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
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

    startTransition(async () => {
      const result = await createBarbershop({
        name,
        slug,
        phone,
        city,
        selectedServices,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Reload completo garante dados frescos do banco
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="flex flex-col gap-8">
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
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-[#3F3F46]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#FF2D55";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            />
          </div>

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
                livo.com.br/
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "#A1A1AA" }}
              >
                Telefone (opcional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(16) 99999-9999"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-[#3F3F46]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#FF2D55";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>
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
                placeholder="Ribeirao Preto"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-[#3F3F46]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#FF2D55";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>
          </div>
        </div>

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
          Todas as configuracoes podem ser alteradas depois nas Configuracoes
        </p>
      </form>
    </div>
  );
}
