"use client";

import { useEffect, useState, useTransition } from "react";
import { createAppointment, getAvailableSlots } from "./actions";

const DAYS_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// ── Máscara de telefone ───────────────────────────────────────
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface Props {
  barbershopId: string;
  professionalId: string;
  serviceName: string;
  serviceId: string;
  serviceDuration: number;
  servicePrice: number;
  barbershopName: string;
  barbershopSlug: string;
}

export function BookingForm({
  barbershopId,
  professionalId,
  serviceName,
  serviceId,
  serviceDuration,
  servicePrice,
  barbershopName,
  barbershopSlug,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime("");
    setAvailableSlots([]);

    getAvailableSlots({
      barbershopId,
      professionalId,
      serviceId,
      date: selectedDate,
    }).then((slots) => {
      setAvailableSlots(slots);
      setLoadingSlots(false);
    });
  }, [selectedDate, barbershopId, professionalId, serviceId]);

  const today = new Date().toISOString().split("T")[0];

  function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T12:00:00`);
    return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientPhone(applyPhoneMask(e.target.value));
  }

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await createAppointment({
        barbershopId,
        professionalId,
        serviceId,
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

      setStep(3);
    });
  }

  // ── ETAPA 3: Confirmação ──────────────────────────────────
  if (step === 3) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <div className="text-6xl mb-6">✅</div>
        <h2
          className="font-black text-white mb-3"
          style={{ fontSize: "28px", letterSpacing: "-0.5px" }}
        >
          Agendado!
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "#A1A1AA", maxWidth: "320px", lineHeight: 1.7 }}
        >
          Seu agendamento em{" "}
          <strong style={{ color: "#FFFFFF" }}>{barbershopName}</strong> está
          confirmado.
        </p>

        <div
          className="w-full rounded-2xl p-5 mb-8 text-left"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { icon: "✂️", label: "Serviço", value: serviceName },
            { icon: "📅", label: "Data", value: formatDate(selectedDate) },
            { icon: "🕐", label: "Horário", value: selectedTime },
            { icon: "👤", label: "Cliente", value: clientName },
            { icon: "📞", label: "Telefone", value: clientPhone },
          ].map((item) => (
            <div
              key={item.label}
              className="flex gap-3 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span>{item.icon}</span>
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <a
          href={`/${barbershopSlug}`}
          className="w-full py-3 rounded-xl font-bold text-sm text-white text-center block transition-all hover:opacity-80"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Voltar para a barbearia
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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

      {/* Card do serviço */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{
          background: "rgba(255,45,85,0.06)",
          border: "1px solid rgba(255,45,85,0.2)",
        }}
      >
        <div>
          <p className="font-bold text-white text-sm">{serviceName}</p>
          <p className="text-xs mt-0.5" style={{ color: "#A1A1AA" }}>
            {serviceDuration} min
          </p>
        </div>
        <p
          className="font-black"
          style={{ color: "#FF2D55", fontSize: "18px" }}
        >
          R$ {(servicePrice / 100).toFixed(0)}
        </p>
      </div>

      {/* Indicador de etapas */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "Data e horário" },
          { n: 2, label: "Seus dados" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold"
                style={{
                  width: 22,
                  height: 22,
                  background:
                    step >= s.n ? "#FF2D55" : "rgba(255,255,255,0.06)",
                  color: step >= s.n ? "#fff" : "#3F3F46",
                }}
              >
                {s.n}
              </div>
              <span
                className="text-xs font-semibold hidden sm:block"
                style={{ color: step >= s.n ? "#A1A1AA" : "#3F3F46" }}
              >
                {s.label}
              </span>
            </div>
            {i === 0 && (
              <div
                className="h-px mx-2"
                style={{ background: "rgba(255,255,255,0.06)", width: "20px" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── ETAPA 1: Data e horário ─────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
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

          {selectedDate && (
            <div>
              <label
                className="block text-xs font-semibold mb-3"
                style={{ color: "#A1A1AA" }}
              >
                Selecione o horário *
              </label>

              {loadingSlots ? (
                <div
                  className="flex items-center gap-2 py-4"
                  style={{ color: "#52525B" }}
                >
                  <div
                    className="animate-spin rounded-full"
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.1)",
                      borderTopColor: "#FF2D55",
                    }}
                  />
                  <span className="text-sm">
                    Verificando horários disponíveis...
                  </span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div
                  className="py-6 text-center rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-sm mb-1" style={{ color: "#A1A1AA" }}>
                    Nenhum horário disponível
                  </p>
                  <p className="text-xs" style={{ color: "#52525B" }}>
                    Escolha outra data
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className="py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                      style={{
                        background:
                          selectedTime === slot
                            ? "#FF2D55"
                            : "rgba(255,255,255,0.04)",
                        border:
                          selectedTime === slot
                            ? "none"
                            : "1px solid rgba(255,255,255,0.08)",
                        color: selectedTime === slot ? "#fff" : "#A1A1AA",
                        boxShadow:
                          selectedTime === slot
                            ? "0 4px 12px rgba(255,45,85,0.3)"
                            : "none",
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!selectedDate || !selectedTime}
            className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "#FF2D55",
              boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
            }}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── ETAPA 2: Dados do cliente ───────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div
            className="p-4 rounded-xl flex flex-wrap gap-4"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>
                Data
              </p>
              <p className="text-sm font-semibold text-white">
                {formatDate(selectedDate)}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>
                Horário
              </p>
              <p className="text-sm font-semibold" style={{ color: "#FF2D55" }}>
                {selectedTime}
              </p>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Seu nome *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como você se chama?"
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>

          {/* Telefone com máscara */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              Telefone (WhatsApp) *
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={handlePhoneChange}
              placeholder="(16) 99999-9999"
              maxLength={15}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>

          {/* E-mail */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "#A1A1AA" }}
            >
              E-mail (opcional)
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="para receber confirmacao"
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
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
              onClick={() => setStep(1)}
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
              style={{
                background: "#FF2D55",
                boxShadow: "0 6px 20px rgba(255,45,85,0.3)",
              }}
            >
              {isPending ? "Confirmando..." : "Confirmar agendamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
