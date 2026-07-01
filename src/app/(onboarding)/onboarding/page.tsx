// src/app/(onboarding)/onboarding/page.tsx
"use client";

import { useState } from "react";
import { CPFInput } from "@/components/ui/cpf-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidCPF } from "@/lib/masks";
import { createBarbershop } from "./actions";

// Funções de máscara
function maskCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, "$1-$2").replace(/-$/, "");
}
function maskDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}
function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function fetchCEP(cep: string) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [slug, setSlug] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [landline, setLandline] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  async function handleCEPBlur() {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    const data = await fetchCEP(clean);
    if (data) {
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
    }
    setCepLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Converter DD/MM/AAAA → AAAA-MM-DD para o banco
    const [dd, mm, aaaa] = birthDate.split("/");
    const birthDateISO = aaaa && mm && dd ? `${aaaa}-${mm}-${dd}` : "";

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("cpf", cpf);
    formData.set("birthDate", birthDateISO);
    formData.set("phone", phone);
    formData.set("barbershopName", barbershopName);
    formData.set("slug", slug);
    formData.set("street", street);
    formData.set("neighborhood", neighborhood);
    formData.set("cep", cep);
    formData.set("city", city);
    formData.set("state", state);
    formData.set("landline", landline);

    try {
      const result = await createBarbershop(formData);
      // Sucesso → a action redireciona no servidor; não retorna aqui.
      // Erro de negócio → a action RETORNA { error } (não lança), o que
      // sobrevive à fronteira server→client em produção (throws são redigidos).
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err: unknown) {
      // Rede de segurança para erros realmente inesperados. Em produção o Next
      // redige a mensagem; por isso o caminho amigável usa retorno, não throw.
      setError(err instanceof Error ? err.message : "Erro ao criar barbearia.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-[#17171C] border border-[#2A2A33] rounded-lg px-4 py-3 text-white placeholder-[#6E6E78] focus:outline-none focus:border-[#C8102E] transition-colors";
  const labelClass = "block text-sm font-medium text-[#9A9AA6] mb-1.5";

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Configurar sua barbearia
          </h1>
          <p className="text-[#9A9AA6]">
            {step === 1 ? "Seus dados pessoais" : "Dados da barbearia"}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className={`h-1.5 w-16 rounded-full transition-colors ${step >= 1 ? "bg-[#C8102E]" : "bg-[#2A2A33]"}`}
            />
            <div
              className={`h-1.5 w-16 rounded-full transition-colors ${step >= 2 ? "bg-[#C8102E]" : "bg-[#2A2A33]"}`}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-[#17171C] border border-[#2A2A33] rounded-2xl p-6 space-y-5">
            {/* STEP 1 — Dados pessoais */}
            {step === 1 && (
              <>
                <div>
                  <label className={labelClass}>Nome completo *</label>
                  <input
                    className={inputClass}
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>CPF *</label>
                    <CPFInput
                      className={inputClass}
                      value={cpf}
                      onChange={setCpf}
                      required
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Data de nascimento *</label>
                    <input
                      className={inputClass}
                      placeholder="DD/MM/AAAA"
                      value={birthDate}
                      onChange={(e) => setBirthDate(maskDate(e.target.value))}
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Celular *</label>
                    <PhoneInput
                      className={inputClass}
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={setPhone}
                      required
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone fixo</label>
                    <PhoneInput
                      className={inputClass}
                      placeholder="(00) 0000-0000"
                      value={landline}
                      onChange={setLandline}
                      maxLength={14}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!fullName || !cpf || !birthDate || !phone) {
                      setError("Preencha todos os campos obrigatórios.");
                      return;
                    }
                    if (!isValidCPF(cpf)) {
                      setError("CPF inválido.");
                      return;
                    }
                    // Valida se a data está completa (DD/MM/AAAA = 10 chars)
                    if (birthDate.length < 10) {
                      setError("Data de nascimento incompleta.");
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                  className="w-full bg-[#C8102E] hover:bg-[#E0263D] text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Próximo →
                </button>
              </>
            )}

            {/* STEP 2 — Dados da barbearia */}
            {step === 2 && (
              <>
                <div>
                  <label className={labelClass}>Nome da barbearia *</label>
                  <input
                    className={inputClass}
                    placeholder="Ex: Barbearia TX"
                    value={barbershopName}
                    onChange={(e) => {
                      setBarbershopName(e.target.value);
                      setSlug(slugify(e.target.value));
                    }}
                    required
                  />
                </div>

                {/* Link gerado automaticamente — somente leitura */}
                <div>
                  <label className={labelClass}>Link da sua página</label>
                  <div className="flex items-center bg-[#0B0B0D] border border-[#2A2A33] rounded-lg overflow-hidden">
                    <span className="px-3 text-[#6E6E78] text-sm whitespace-nowrap">
                      livobarber.com.br/
                    </span>
                    <span className="flex-1 py-3 pr-4 text-sm">
                      {slug ? (
                        <span className="text-white">{slug}</span>
                      ) : (
                        <span className="text-[#3A3A43]">
                          gerado automaticamente
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E78] mt-1">
                    Gerado automaticamente a partir do nome da barbearia.
                  </p>
                </div>

                {/* Endereço — obrigatório */}
                <div className="border-t border-[#2A2A33] pt-5">
                  <p className="text-sm font-semibold text-white mb-4">
                    Endereço da barbearia *
                  </p>
                  <p className="text-xs text-[#6E6E78] mb-4">
                    Preencha o endereço completo e correto — ele será exibido
                    para os clientes encontrarem sua barbearia.
                  </p>

                  <div className="mb-4">
                    <label className={labelClass}>CEP *</label>
                    <div className="relative">
                      <input
                        className={inputClass}
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => setCep(maskCEP(e.target.value))}
                        onBlur={handleCEPBlur}
                        required
                        maxLength={9}
                      />
                      {cepLoading && (
                        <span className="absolute right-3 top-3 text-[#9A9AA6] text-sm">
                          Buscando...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6E6E78] mt-1">
                      Digite o CEP para preencher o endereço automaticamente.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className={labelClass}>Rua / Logradouro *</label>
                    <input
                      className={inputClass}
                      placeholder="Ex: Rua das Flores, 123"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={labelClass}>Bairro *</label>
                      <input
                        className={inputClass}
                        placeholder="Centro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cidade *</label>
                      <input
                        className={inputClass}
                        placeholder="Batatais"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Estado (UF) *</label>
                    <input
                      className={inputClass}
                      placeholder="SP"
                      value={state}
                      onChange={(e) =>
                        setState(e.target.value.toUpperCase().slice(0, 2))
                      }
                      required
                      maxLength={2}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-[#2A2A33] text-[#9A9AA6] hover:text-white hover:border-[#9A9AA6] font-semibold py-3 rounded-lg transition-colors"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    {loading ? "Criando..." : "Criar minha barbearia →"}
                  </button>
                </div>
              </>
            )}
          </div>

          {step === 1 && error && (
            <p className="text-red-400 text-sm text-center mt-3">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
