// src/app/(dashboard)/dashboard/settings/business-hours-form.tsx
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
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
      style={{ backgroundColor: "var(--color-primary)" }}
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

  const selectStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    width: 90,
    textAlign: "center",
  };

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
          Horários de funcionamento
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          Define quando os clientes podem agendar
        </p>
      </div>

      <form
        action={action}
        style={{ backgroundColor: "var(--bg-card-elevated)" }}
      >
        <div className="p-6 flex flex-col gap-1">
          {businessHours.map((hour, i) => {
            const isOpen = openDays[hour.dayOfWeek];
            const isToday = new Date().getDay() === hour.dayOfWeek;

            return (
              <div
                key={hour.dayOfWeek}
                className="flex items-center gap-3 py-3"
                style={{
                  borderBottom: i < 6 ? "1px solid var(--border)" : undefined,
                }}
              >
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
                    backgroundColor: isOpen
                      ? "var(--color-primary)"
                      : "var(--bg-card)",
                    border: "1px solid var(--border)",
                    transition: "background-color 0.2s",
                  }}
                >
                  <span
                    className="absolute top-0.5"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: "var(--text-primary)",
                      left: isOpen ? "19px" : "2px",
                      transition: "left 0.2s",
                    }}
                  />
                </button>

                {/* Nome do dia */}
                <span
                  className="text-sm font-semibold shrink-0"
                  style={{
                    color: isOpen
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    minWidth: 60,
                  }}
                >
                  {DAYS[hour.dayOfWeek]}
                  {isToday && (
                    <span
                      className="ml-1 text-xs"
                      style={{ color: "var(--color-primary)" }}
                    >
                      •
                    </span>
                  )}
                </span>

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
                          style={{ backgroundColor: "var(--bg-card)" }}
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                    <span
                      className="text-xs shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
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
                          style={{ backgroundColor: "var(--bg-card)" }}
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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
              className="text-xs px-3 py-2 rounded-lg mt-2"
              style={{
                color: "var(--status-green)",
                backgroundColor: "rgba(0,212,160,0.08)",
              }}
            >
              <Check size={14} className="inline mr-1" />Horários salvos com sucesso.
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
