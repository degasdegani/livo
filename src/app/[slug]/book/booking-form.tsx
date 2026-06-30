"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { PhoneInput } from "@/components/ui/phone-input";
import type { SlotInfo } from "@/lib/availability";
import { formatPhoneBR } from "@/lib/masks";
import { createAppointment, getAvailableSlots } from "./actions";

// ── Constantes ────────────────────────────────────────────────
const DAYS_FULL = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ── Tipos ─────────────────────────────────────────────────────
type Step = "professional" | "datetime" | "clientinfo" | "done";

interface ServiceInfo {
  id: string;
  name: string;
  durationMin: number;
  priceInCents: number;
}

interface ProfessionalInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Props {
  barbershopId: string;
  serviceIds: string[];
  services: ServiceInfo[];
  professionals: ProfessionalInfo[];
  barbershopName: string;
  barbershopSlug: string;
}

// ── Helpers ───────────────────────────────────────────────────
function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

// ── Avatar de profissional (foto ou iniciais) ─────────────────
function ProfAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={56}
        height={56}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "rgba(255,45,85,0.12)",
        border: "1px solid rgba(255,45,85,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FF2D55",
        fontWeight: 700,
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── Resumo de serviços (card reutilizado em vários steps) ─────
function ServicesSummaryCard({ services }: { services: ServiceInfo[] }) {
  const total = services.reduce((sum, s) => sum + s.priceInCents, 0);
  const totalMin = services.reduce((sum, s) => sum + s.durationMin, 0);

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "rgba(255,45,85,0.06)",
        border: "1px solid rgba(255,45,85,0.2)",
      }}
    >
      {services.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-0.5">
          <p className="text-sm font-medium text-white">{s.name}</p>
          <p className="text-sm" style={{ color: "#A1A1AA" }}>
            {formatCents(s.priceInCents)}
          </p>
        </div>
      ))}
      <div
        className="flex items-center justify-between mt-2 pt-2"
        style={{ borderTop: "1px solid rgba(255,45,85,0.15)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "#A1A1AA" }}>
          Total · {totalMin} min
        </p>
        <p
          className="font-black"
          style={{ color: "#FF2D55", fontSize: "18px", letterSpacing: "-0.5px" }}
        >
          {formatCents(total)}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BookingForm
// ══════════════════════════════════════════════════════════════
export function BookingForm({
  barbershopId,
  serviceIds,
  services,
  professionals,
  barbershopName,
  barbershopSlug,
}: Props) {
  const hasProfessionalChoice = professionals.length > 1;
  const initialStep: Step = hasProfessionalChoice ? "professional" : "datetime";

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedProfId, setSelectedProfId] = useState(professionals[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const serviceIdsKey = serviceIds.join(",");

  // Recarrega slots ao trocar data ou profissional
  useEffect(() => {
    if (!selectedDate || !selectedProfId) return;
    setLoadingSlots(true);
    setSelectedTime("");
    setSlots([]);

    getAvailableSlots({
      barbershopId,
      professionalId: selectedProfId,
      serviceIds,
      date: selectedDate,
    }).then((result) => {
      setSlots(result);
      setLoadingSlots(false);
    });
    // serviceIdsKey estabiliza o array de IDs como dependência
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedProfId, barbershopId, serviceIdsKey]);

  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const today = new Date().toISOString().split("T")[0];

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await createAppointment({
        barbershopId,
        professionalId: selectedProfId,
        serviceIds,
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone,
        clientEmail: clientEmail || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setStep("done");
    });
  }

  // ── STEP: done (confirmação) ──────────────────────────────
  if (step === "done") {
    const total = services.reduce((sum, s) => sum + s.priceInCents, 0);
    return (
      <div className="flex flex-col items-center text-center py-8">
        <div className="text-6xl mb-6">✅</div>
        <h2
          className="font-black text-white mb-3"
          style={{ fontSize: "28px", letterSpacing: "-0.5px" }}
        >
          Agendado!
        </h2>
        <p className="text-sm mb-6" style={{ color: "#A1A1AA", maxWidth: "320px", lineHeight: 1.7 }}>
          Seu agendamento em{" "}
          <strong style={{ color: "#FFFFFF" }}>{barbershopName}</strong> está confirmado.
        </p>

        <div
          className="w-full rounded-2xl p-5 mb-8 text-left"
          style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {services.map((s) => (
            <div
              key={s.id}
              className="flex gap-3 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span>✂️</span>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{s.name}</p>
                <p className="text-sm" style={{ color: "#A1A1AA" }}>{formatCents(s.priceInCents)}</p>
              </div>
            </div>
          ))}
          {[
            { icon: "💰", label: "Total", value: formatCents(total) },
            { icon: "📅", label: "Data", value: formatDate(selectedDate) },
            { icon: "🕐", label: "Horário", value: selectedTime },
            { icon: "👤", label: "Cliente", value: clientName },
            { icon: "📞", label: "Telefone", value: formatPhoneBR(clientPhone) },
            ...(selectedProf ? [{ icon: "💈", label: "Profissional", value: selectedProf.name }] : []),
          ].map((item) => (
            <div
              key={item.label}
              className="flex gap-3 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span>{item.icon}</span>
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>{item.label}</p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <a
          href={`/${barbershopSlug}`}
          className="w-full py-3 rounded-xl font-bold text-sm text-white text-center block transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          Voltar para a barbearia
        </a>
      </div>
    );
  }

  // ── Header compartilhado ──────────────────────────────────
  const header = (
    <div>
      <a
        href={`/${barbershopSlug}`}
        className="flex items-center gap-1 text-xs mb-4 hover:opacity-70 transition-opacity"
        style={{ color: "#52525B" }}
      >
        ← Voltar
      </a>
      <h2
        className="font-black text-white mb-1"
        style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
      >
        Agendar serviço
      </h2>
      <p className="text-sm" style={{ color: "#52525B" }}>
        {barbershopName}
      </p>
    </div>
  );

  // ── Indicador de etapas ───────────────────────────────────
  const stepDefs = hasProfessionalChoice
    ? [
        { key: "professional" as Step, label: "Profissional" },
        { key: "datetime" as Step, label: "Data e horário" },
        { key: "clientinfo" as Step, label: "Seus dados" },
      ]
    : [
        { key: "datetime" as Step, label: "Data e horário" },
        { key: "clientinfo" as Step, label: "Seus dados" },
      ];

  const currentStepIdx = stepDefs.findIndex((s) => s.key === step);

  const stepIndicator = (
    <div className="flex items-center gap-2">
      {stepDefs.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{
                width: 22,
                height: 22,
                background: currentStepIdx >= i ? "#FF2D55" : "rgba(255,255,255,0.06)",
                color: currentStepIdx >= i ? "#fff" : "#3F3F46",
              }}
            >
              {i + 1}
            </div>
            <span
              className="text-xs font-semibold hidden sm:block"
              style={{ color: currentStepIdx >= i ? "#A1A1AA" : "#3F3F46" }}
            >
              {s.label}
            </span>
          </div>
          {i < stepDefs.length - 1 && (
            <div
              className="h-px mx-2"
              style={{ background: "rgba(255,255,255,0.06)", width: "20px" }}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ── STEP: professional ────────────────────────────────────
  if (step === "professional") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ServicesSummaryCard services={services} />
        {stepIndicator}

        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: "#A1A1AA" }}>
            Escolha o profissional *
          </p>
          <div className="grid grid-cols-2 gap-3">
            {professionals.map((prof) => {
              const isOn = selectedProfId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSelectedProfId(prof.id)}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all text-center"
                  style={{
                    background: isOn ? "rgba(255,45,85,0.08)" : "rgba(255,255,255,0.03)",
                    border: isOn
                      ? "1px solid rgba(255,45,85,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <ProfAvatar name={prof.name} avatarUrl={prof.avatarUrl} />
                  <p
                    className="text-sm font-bold text-white leading-tight"
                    style={{ color: isOn ? "#FFFFFF" : "#E4E4E7" }}
                  >
                    {prof.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep("datetime")}
          disabled={!selectedProfId}
          className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "#FF2D55", boxShadow: "0 8px 24px rgba(255,45,85,0.3)" }}
        >
          Continuar →
        </button>
      </div>
    );
  }

  // ── STEP: datetime ────────────────────────────────────────
  if (step === "datetime") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ServicesSummaryCard services={services} />
        {stepIndicator}

        {/* Profissional selecionado (se houver escolha) */}
        {hasProfessionalChoice && selectedProf && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ProfAvatar name={selectedProf.name} avatarUrl={selectedProf.avatarUrl} />
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>Profissional</p>
              <p className="text-sm font-semibold text-white">{selectedProf.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("professional")}
              className="ml-auto text-xs transition-opacity hover:opacity-70"
              style={{ color: "#FF2D55" }}
            >
              Trocar
            </button>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* Seleção de data */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#A1A1AA" }}>
              Selecione a data *
            </label>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                colorScheme: "dark",
              }}
            />
            {selectedDate && (
              <p className="text-xs mt-2" style={{ color: "#FF2D55" }}>
                {formatDate(selectedDate)}
              </p>
            )}
          </div>

          {/* Grade de horários */}
          {selectedDate && (
            <div>
              <label className="block text-xs font-semibold mb-3" style={{ color: "#A1A1AA" }}>
                Selecione o horário *
              </label>

              {loadingSlots ? (
                <div className="flex items-center gap-2 py-4" style={{ color: "#52525B" }}>
                  <div
                    className="animate-spin rounded-full"
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.1)",
                      borderTopColor: "#FF2D55",
                    }}
                  />
                  <span className="text-sm">Verificando horários disponíveis...</span>
                </div>
              ) : slots.length === 0 ? (
                <div
                  className="py-6 text-center rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-sm mb-1" style={{ color: "#A1A1AA" }}>
                    Nenhum horário disponível
                  </p>
                  <p className="text-xs" style={{ color: "#52525B" }}>Escolha outra data</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        className="py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                        style={
                          !slot.available
                            ? {
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.04)",
                                color: "#3F3F46",
                                opacity: 0.4,
                                cursor: "not-allowed",
                              }
                            : isSelected
                            ? {
                                background: "#FF2D55",
                                border: "none",
                                color: "#fff",
                                boxShadow: "0 4px 12px rgba(255,45,85,0.3)",
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#A1A1AA",
                              }
                        }
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep("clientinfo")}
            disabled={!selectedDate || !selectedTime}
            className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "#FF2D55", boxShadow: "0 8px 24px rgba(255,45,85,0.3)" }}
          >
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: clientinfo ──────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {header}
      <ServicesSummaryCard services={services} />
      {stepIndicator}

      <div className="flex flex-col gap-5">
        {/* Resumo data/hora */}
        <div
          className="p-4 rounded-xl flex flex-wrap gap-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>Data</p>
            <p className="text-sm font-semibold text-white">{formatDate(selectedDate)}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>Horário</p>
            <p className="text-sm font-semibold" style={{ color: "#FF2D55" }}>{selectedTime}</p>
          </div>
          {hasProfessionalChoice && selectedProf && (
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>Profissional</p>
              <p className="text-sm font-semibold text-white">{selectedProf.name}</p>
            </div>
          )}
        </div>

        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "#A1A1AA" }}>
            Seu nome *
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Como você se chama?"
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "#A1A1AA" }}>
            Telefone (WhatsApp) *
          </label>
          <PhoneInput
            value={clientPhone}
            onChange={setClientPhone}
            maxLength={15}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "#A1A1AA" }}>
            E-mail (opcional)
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="para receber confirmacao"
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {error && (
          <p
            className="text-xs text-center py-2 px-3 rounded-lg"
            style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("datetime")}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#A1A1AA",
            }}
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !clientName.trim() || !clientPhone.trim()}
            className="flex-1 py-3 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "#FF2D55", boxShadow: "0 6px 20px rgba(255,45,85,0.3)" }}
          >
            {isPending ? "Confirmando..." : "Confirmar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
