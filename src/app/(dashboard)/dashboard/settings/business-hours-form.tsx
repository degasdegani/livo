"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateBusinessHours } from "./actions";

const DAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// Gera opções de horário de 06:00 a 23:30 (a cada 30 min)
function getTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      options.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
    }
  }
  return options;
}
const TIME_OPTIONS = getTimeOptions();

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: "#FF2D55" }}
    >
      {pending ? "Salvando..." : "Salvar horários"}
    </button>
  );
}

interface BusinessHour {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export function BusinessHoursForm({
  businessHours,
}: {
  businessHours: BusinessHour[];
}) {
  const [state, action] = useActionState(updateBusinessHours, null);
  const [openDays, setOpenDays] = useState<Record<number, boolean>>(
    Object.fromEntries(businessHours.map((h) => [h.dayOfWeek, h.isOpen])),
  );

  const selectStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#FFFFFF",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    width: "90px",
    textAlign: "center" as const,
  };

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
        <p className="font-bold text-white text-sm">
          Horários de funcionamento
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
          Define quando os clientes podem agendar
        </p>
      </div>

      <form action={action} style={{ background: "#080808" }}>
        <div className="p-6 flex flex-col gap-1">
          {businessHours.map((hour, i) => {
            const isOpen = openDays[hour.dayOfWeek];
            const isToday = new Date().getDay() === hour.dayOfWeek;

            return (
              <div
                key={hour.dayOfWeek}
                className="flex items-center gap-3 py-3"
                style={{
                  borderBottom:
                    i < 6 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                }}
              >
                {/* Hidden: isOpen */}
                <input
                  type="hidden"
                  name={`isOpen_${hour.dayOfWeek}`}
                  value={isOpen ? "true" : "false"}
                />

                {/* Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setOpenDays((p) => ({
                      ...p,
                      [hour.dayOfWeek]: !p[hour.dayOfWeek],
                    }))
                  }
                  className="relative shrink-0"
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: isOpen ? "#FF2D55" : "rgba(255,255,255,0.1)",
                    transition: "background 0.2s",
                  }}
                >
                  <span
                    className="absolute top-0.5"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      left: isOpen ? "18px" : "2px",
                      transition: "left 0.2s",
                    }}
                  />
                </button>

                {/* Nome do dia */}
                <span
                  className="text-sm font-semibold shrink-0"
                  style={{
                    color: isOpen ? "#FFFFFF" : "#52525B",
                    minWidth: "60px",
                  }}
                >
                  {DAYS[hour.dayOfWeek]}
                  {isToday && (
                    <span className="ml-1 text-xs" style={{ color: "#FF2D55" }}>
                      •
                    </span>
                  )}
                </span>

                {/* Seletores de horário ou "Fechado" */}
                {isOpen ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      name={`openTime_${hour.dayOfWeek}`}
                      defaultValue={hour.openTime}
                      style={selectStyle}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option
                          key={t}
                          value={t}
                          style={{ background: "#1A1A1A" }}
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                    <span
                      className="text-xs shrink-0"
                      style={{ color: "#3F3F46" }}
                    >
                      até
                    </span>
                    <select
                      name={`closeTime_${hour.dayOfWeek}`}
                      defaultValue={hour.closeTime}
                      style={selectStyle}
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option
                          key={t}
                          value={t}
                          style={{ background: "#1A1A1A" }}
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-xs" style={{ color: "#3F3F46" }}>
                      Fechado
                    </span>
                    <input
                      type="hidden"
                      name={`openTime_${hour.dayOfWeek}`}
                      value={hour.openTime}
                    />
                    <input
                      type="hidden"
                      name={`closeTime_${hour.dayOfWeek}`}
                      value={hour.closeTime}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {state?.error && (
            <p
              className="text-xs px-3 py-2 rounded-lg mt-2"
              style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
            >
              {state.error}
            </p>
          )}
          {state?.success && (
            <p
              className="text-xs px-3 py-2 rounded-lg mt-2"
              style={{ color: "#00D4A0", background: "rgba(0,212,160,0.08)" }}
            >
              ✓ Horários salvos com sucesso.
            </p>
          )}

          <div className="flex justify-end mt-4">
            <SaveButton />
          </div>
        </div>
      </form>
    </section>
  );
}
