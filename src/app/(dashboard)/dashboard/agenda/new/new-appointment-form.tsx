// ============================================================
// LIVO — Formulário de Agendamento Manual
// Barbeiro registra walk-ins e pedidos por telefone
// ============================================================

"use client";

import { useEffect, useState, useTransition } from "react";
import { createManualAppointment, getBarberAvailableSlots } from "./actions";

// Máscara de telefone
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, "($1");
  if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, "($1) $2");
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

const DAYS_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const MONTHS_PT = [
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceInCents: number;
}

interface Professional {
  id: string;
  name: string;
}

interface Props {
  services: Service[];
  professional: Professional;
  barbershopId: string;
}

export function NewAppointmentForm({
  services,
  professional,
  barbershopId,
}: Props) {
  const [selectedService, setSelectedService] = useState(services[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  // Carrega slots quando data ou serviço mudam
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    setLoadingSlots(true);
    setSelectedTime("");
    setAvailableSlots([]);

    getBarberAvailableSlots({
      barbershopId,
      professionalId: professional.id,
      serviceId: selectedService,
      date: selectedDate,
    }).then((slots) => {
      setAvailableSlots(slots);
      setLoadingSlots(false);
    });
  }, [selectedDate, selectedService, barbershopId, professional.id]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTime) {
      setError("Selecione um horário.");
      return;
    }
    if (!clientName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!clientPhone.trim()) {
      setError("Informe o telefone.");
      return;
    }

    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("time", selectedTime);

    startTransition(async () => {
      try {
        await createManualAppointment(formData);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      }
    });
  }

  const selectedServiceData = services.find((s) => s.id === selectedService);

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Inputs hidden para o server action */}
      <input type="hidden" name="serviceId" value={selectedService} />
      <input type="hidden" name="professionalId" value={professional.id} />
      <input type="hidden" name="barbershopId" value={barbershopId} />
      <input type="hidden" name="date" value={selectedDate} />

      {/* ── Seção 1: Serviço ────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <p className="font-bold text-white text-sm mb-0.5">Serviço</p>
          <p className="text-xs" style={{ color: "#52525B" }}>
            Qual serviço será realizado?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedService(service.id)}
              className="flex items-center justify-between p-3 rounded-xl text-left transition-all"
              style={{
                background:
                  selectedService === service.id
                    ? "rgba(255,45,85,0.08)"
                    : "rgba(255,255,255,0.02)",
                border:
                  selectedService === service.id
                    ? "1px solid rgba(255,45,85,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div>
                <p
                  className="font-semibold text-sm"
                  style={{
                    color:
                      selectedService === service.id ? "#FFFFFF" : "#A1A1AA",
                  }}
                >
                  {service.name}
                </p>
                <p className="text-xs" style={{ color: "#52525B" }}>
                  {service.durationMin} min
                </p>
              </div>
              <p
                className="font-black text-sm"
                style={{
                  color: selectedService === service.id ? "#FF2D55" : "#52525B",
                }}
              >
                R$ {(service.priceInCents / 100).toFixed(0)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Seção 2: Data e horário ─────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <p className="font-bold text-white text-sm mb-0.5">Data e horário</p>
          <p className="text-xs" style={{ color: "#52525B" }}>
            Quando será o atendimento?
          </p>
        </div>

        {/* Data */}
        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Data *
          </label>
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
            style={{ ...inputStyle, colorScheme: "dark" }}
          />
          {selectedDate && (
            <p className="text-xs mt-1.5" style={{ color: "#FF2D55" }}>
              {formatDate(selectedDate)}
            </p>
          )}
        </div>

        {/* Slots */}
        {selectedDate && (
          <div>
            <label
              className="block text-xs font-semibold mb-3"
              style={{ color: "#A1A1AA" }}
            >
              Horário *
            </label>

            {loadingSlots ? (
              <div
                className="flex items-center gap-2 py-2"
                style={{ color: "#52525B" }}
              >
                <div
                  className="animate-spin rounded-full"
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.1)",
                    borderTopColor: "#FF2D55",
                  }}
                />
                <span className="text-xs">Verificando disponibilidade...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div
                className="py-5 text-center rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-sm" style={{ color: "#A1A1AA" }}>
                  Nenhum horário disponível
                </p>
                <p className="text-xs mt-1" style={{ color: "#52525B" }}>
                  Escolha outra data ou verifique os horários de funcionamento
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all"
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

        {/* Profissional (informativo) */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span className="text-xs" style={{ color: "#52525B" }}>
            Profissional:
          </span>
          <span className="text-xs font-semibold" style={{ color: "#A1A1AA" }}>
            {professional.name}
          </span>
        </div>
      </div>

      {/* ── Seção 3: Dados do cliente ────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <p className="font-bold text-white text-sm mb-0.5">
            Dados do cliente
          </p>
          <p className="text-xs" style={{ color: "#52525B" }}>
            Nome e contato para o CRM
          </p>
        </div>

        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Nome do cliente *
          </label>
          <input
            name="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="João Silva"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={inputStyle}
          />
        </div>

        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Telefone *
          </label>
          <input
            name="clientPhone"
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(maskPhone(e.target.value))}
            placeholder="(16) 99999-9999"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <p
          className="text-xs text-center py-3 px-4 rounded-xl"
          style={{
            color: "#FF2D55",
            background: "rgba(255,45,85,0.08)",
            border: "1px solid rgba(255,45,85,0.2)",
          }}
        >
          {error}
        </p>
      )}

      {/* Resumo antes de confirmar */}
      {selectedDate && selectedTime && selectedServiceData && (
        <div
          className="p-4 rounded-xl flex flex-wrap gap-4"
          style={{
            background: "rgba(255,45,85,0.04)",
            border: "1px solid rgba(255,45,85,0.15)",
          }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>
              Serviço
            </p>
            <p className="text-sm font-bold text-white">
              {selectedServiceData.name}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>
              Data
            </p>
            <p className="text-sm font-bold text-white">
              {formatDate(selectedDate)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#52525B" }}>
              Horário
            </p>
            <p className="text-sm font-bold" style={{ color: "#FF2D55" }}>
              {selectedTime}
            </p>
          </div>
        </div>
      )}

      {/* Botão de confirmar */}
      <button
        type="submit"
        disabled={
          isPending ||
          !selectedDate ||
          !selectedTime ||
          !clientName.trim() ||
          !clientPhone.trim()
        }
        className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: "#FF2D55",
          boxShadow: "0 8px 32px rgba(255,45,85,0.3)",
          letterSpacing: "-0.3px",
        }}
      >
        {isPending ? "Registrando agendamento..." : "Confirmar agendamento →"}
      </button>

      <p className="text-center text-xs" style={{ color: "#3F3F46" }}>
        O cliente será adicionado ao CRM automaticamente
      </p>
    </form>
  );
}
