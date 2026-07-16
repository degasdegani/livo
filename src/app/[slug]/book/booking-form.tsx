"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Phone,
  Scissors,
  Star,
  User,
  UserCog,
} from "lucide-react";
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
type Step = "service" | "professional" | "datetime" | "clientinfo" | "done";

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
  specialties: string[];
  yearStarted: number | null;
  avgRating: number | null;
  reviewCount: number;
}

interface Props {
  barbershopId: string;
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
  services,
  professionals,
  barbershopName,
  barbershopSlug,
}: Props) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const hasProfessionalChoice = professionals.length > 1;
  const [step, setStep] = useState<Step>("service");
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

  const serviceIdsKey = selectedServiceIds.join(",");

  // Recarrega slots ao trocar data ou profissional
  useEffect(() => {
    if (!selectedDate || !selectedProfId) return;
    setLoadingSlots(true);
    setSelectedTime("");
    setSlots([]);

    getAvailableSlots({
      barbershopId,
      professionalId: selectedProfId,
      serviceIds: selectedServiceIds,
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
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await createAppointment({
        barbershopId,
        professionalId: selectedProfId,
        serviceIds: selectedServiceIds,
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
    const total = selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);
    return (
      <div className="flex flex-col items-center text-center py-8">
        <CheckCircle2 className="mb-6" size={64} style={{ color: "#00D4A0" }} />
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
          style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {selectedServices.map((s) => (
            <div
              key={s.id}
              className="flex gap-3 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <Scissors size={20} />
              <div className="flex-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{s.name}</p>
                <p className="text-sm" style={{ color: "#A1A1AA" }}>{formatCents(s.priceInCents)}</p>
              </div>
            </div>
          ))}
          {[
            { icon: DollarSign, label: "Total", value: formatCents(total) },
            { icon: CalendarDays, label: "Data", value: formatDate(selectedDate) },
            { icon: Clock, label: "Horário", value: selectedTime },
            { icon: User, label: "Cliente", value: clientName },
            { icon: Phone, label: "Telefone", value: formatPhoneBR(clientPhone) },
            ...(selectedProf ? [{ icon: UserCog, label: "Profissional", value: selectedProf.name }] : []),
          ].map((item) => (
            <div
              key={item.label}
              className="flex gap-3 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <item.icon size={16} />
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
        { key: "service" as Step, label: "Serviço" },
        { key: "professional" as Step, label: "Profissional" },
        { key: "datetime" as Step, label: "Horário" },
        { key: "clientinfo" as Step, label: "Confirmação" },
      ]
    : [
        { key: "service" as Step, label: "Serviço" },
        { key: "datetime" as Step, label: "Horário" },
        { key: "clientinfo" as Step, label: "Confirmação" },
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

  // ── STEP: service ──────────────────────────────────────────
  if (step === "service") {
    function toggleService(id: string) {
      setSelectedServiceIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);
    const canContinue = selectedServiceIds.length > 0;

    return (
      <div className="flex flex-col gap-6">
        {header}
        {stepIndicator}

        <div className="flex flex-col gap-3">
          {services.map((service) => {
            const isOn = selectedServiceIds.includes(service.id);
            return (
              <div
                key={service.id}
                role="checkbox"
                aria-checked={isOn}
                tabIndex={0}
                className="flex items-center justify-between p-4 rounded-2xl cursor-pointer select-none transition-all"
                style={{
                  background: isOn ? "var(--pb-red-selected-bg)" : "var(--pb-card)",
                  border: isOn
                    ? "1px solid var(--pb-red)"
                    : "1px solid var(--pb-border)",
                }}
                onClick={() => toggleService(service.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleService(service.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      flexShrink: 0,
                      background: isOn ? "var(--pb-red)" : "rgba(255,255,255,0.06)",
                      border: isOn
                        ? "1px solid var(--pb-red)"
                        : "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isOn && (
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                        <path
                          d="M1 4L4 7L10 1"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-sm"
                      style={{ color: "var(--pb-text-primary)" }}
                    >
                      {service.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--pb-text-tertiary)" }}
                    >
                      {service.durationMin} min
                    </p>
                  </div>
                </div>
                <p
                  className="font-black ml-4 shrink-0"
                  style={{
                    color: isOn ? "var(--pb-red)" : "var(--pb-text-secondary)",
                    fontSize: "16px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {formatCents(service.priceInCents)}
                </p>
              </div>
            );
          })}
        </div>

        {canContinue && (
          <div
            className="p-4 rounded-2xl flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--pb-border)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--pb-text-primary)" }}>
                {formatCents(totalPrice)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--pb-text-tertiary)" }}>
                {totalDuration} min · {selectedServiceIds.length}{" "}
                {selectedServiceIds.length === 1 ? "serviço" : "serviços"}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setStep(hasProfessionalChoice ? "professional" : "datetime")}
          disabled={!canContinue}
          className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "#FF2D55", boxShadow: "0 8px 24px rgba(255,45,85,0.3)" }}
        >
          Continuar →
        </button>
      </div>
    );
  }

  // ── STEP: professional ────────────────────────────────────
  if (step === "professional") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ServicesSummaryCard services={selectedServices} />
        {stepIndicator}

        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: "#A1A1AA" }}>
            Escolha o profissional *
          </p>
          <div className="flex flex-col gap-3">
            {professionals.map((prof) => {
              const isOn = selectedProfId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSelectedProfId(prof.id)}
                  className="flex items-center gap-3 p-4 rounded-2xl transition-all text-left"
                  style={{
                    background: isOn ? "var(--pb-red-selected-bg)" : "var(--pb-card)",
                    border: isOn
                      ? "1px solid var(--pb-red)"
                      : "1px solid var(--pb-border)",
                  }}
                >
                  <ProfAvatar name={prof.name} avatarUrl={prof.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: "var(--pb-text-primary)" }}
                    >
                      {prof.name}
                    </p>
                    {prof.specialties.length > 0 && (
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--pb-text-secondary)" }}
                      >
                        {prof.specialties.join(" · ")}
                      </p>
                    )}
                    {prof.reviewCount > 0 && prof.avgRating !== null && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={12} fill="var(--pb-gold)" color="var(--pb-gold)" />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "var(--pb-text-primary)" }}
                        >
                          {prof.avgRating.toFixed(1)}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--pb-text-tertiary)" }}
                        >
                          ({prof.reviewCount})
                        </span>
                      </div>
                    )}
                    {prof.yearStarted && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--pb-text-tertiary)" }}
                      >
                        Desde {prof.yearStarted}
                      </p>
                    )}
                  </div>
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
    const availableCount = slots.filter((s) => s.available).length;
    const isLowAvailability =
      slots.length > 0 && availableCount > 0 && availableCount / slots.length < 0.25;

    return (
      <div className="flex flex-col gap-6">
        {header}
        <ServicesSummaryCard services={selectedServices} />
        {stepIndicator}

        {/* Profissional selecionado — sempre visível (inclusive com 1 só
            profissional); botão "Trocar" só quando há mais de um. */}
        {selectedProf && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ProfAvatar name={selectedProf.name} avatarUrl={selectedProf.avatarUrl} />
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>Profissional</p>
              <p className="text-sm font-semibold text-white">{selectedProf.name}</p>
            </div>
            {hasProfessionalChoice && (
              <button
                type="button"
                onClick={() => setStep("professional")}
                className="ml-auto text-xs transition-opacity hover:opacity-70"
                style={{ color: "#FF2D55" }}
              >
                Trocar
              </button>
            )}
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
                <>
                {isLowAvailability && (
                  <p
                    className="text-xs mb-2 flex items-center gap-1.5"
                    style={{ color: "var(--pb-warning)" }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--pb-warning)",
                        display: "inline-block",
                      }}
                    />
                    Poucas vagas disponíveis neste dia
                  </p>
                )}
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
                            : isLowAvailability
                            ? {
                                background: "rgba(255,181,71,0.08)",
                                border: "1px solid var(--pb-warning)",
                                color: "var(--pb-warning)",
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
                </>
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

  // ── STEP: clientinfo (rotulado "Confirmação" no stepper) ──
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);

  return (
    <div className="flex flex-col gap-6">
      {header}
      {stepIndicator}

      <div
        className="rounded-2xl p-5 flex flex-col gap-1"
        style={{ background: "var(--pb-card)", border: "1px solid var(--pb-border)" }}
      >
        {[
          {
            icon: Scissors,
            label: "Serviço",
            value: selectedServices.map((s) => s.name).join(", "),
            extra: formatCents(totalPrice),
          },
          ...(selectedProf
            ? [{ icon: UserCog, label: "Profissional", value: selectedProf.name, extra: null }]
            : []),
          { icon: CalendarDays, label: "Data", value: formatDate(selectedDate), extra: null },
          { icon: Clock, label: "Horário", value: selectedTime, extra: null },
          { icon: Clock, label: "Duração", value: `${totalDuration} min`, extra: null },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className="flex items-start gap-3 py-3"
            style={{
              borderBottom: i < arr.length - 1 ? "1px solid var(--pb-separator)" : undefined,
            }}
          >
            <row.icon size={16} color="var(--pb-text-tertiary)" style={{ marginTop: 2 }} />
            <div className="flex-1 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs mb-0.5" style={{ color: "var(--pb-text-tertiary)" }}>
                  {row.label}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--pb-text-primary)" }}
                >
                  {row.value}
                </p>
              </div>
              {row.extra && (
                <p
                  className="text-sm font-bold shrink-0"
                  style={{ color: "var(--pb-red)" }}
                >
                  {row.extra}
                </p>
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3">
          <p className="text-sm font-semibold" style={{ color: "var(--pb-text-primary)" }}>
            Total
          </p>
          <p
            className="font-black"
            style={{ color: "var(--pb-red)", fontSize: "20px", letterSpacing: "-0.5px" }}
          >
            {formatCents(totalPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
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
