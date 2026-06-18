"use client";

import { useState } from "react";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceInCents: number;
}

interface Props {
  services: Service[];
  slug: string;
}

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(0)}`;
}

export function ServicePicker({ services, slug }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedServices = services.filter((s) => selected.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);
  const canContinue = selected.length > 0;

  function handleContinue() {
    if (!canContinue) return;
    window.location.href = `/${slug}/book?serviceIds=${selected.join(",")}`;
  }

  return (
    <div className="flex flex-col gap-3">
      {services.map((service) => {
        const isOn = selected.includes(service.id);
        return (
          <div
            key={service.id}
            role="checkbox"
            aria-checked={isOn}
            tabIndex={0}
            className="flex items-center justify-between p-4 rounded-2xl cursor-pointer select-none transition-all"
            style={{
              background: isOn ? "rgba(255,45,85,0.08)" : "#0A0A0A",
              border: isOn
                ? "1px solid rgba(255,45,85,0.4)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
            onClick={() => toggle(service.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(service.id);
              }
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Checkbox visual */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  flexShrink: 0,
                  background: isOn ? "#FF2D55" : "rgba(255,255,255,0.06)",
                  border: isOn
                    ? "1px solid #FF2D55"
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
                  style={{ color: isOn ? "#FFFFFF" : "#E4E4E7" }}
                >
                  {service.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
                  {service.durationMin} min
                </p>
              </div>
            </div>

            <p
              className="font-black ml-4 shrink-0"
              style={{
                color: isOn ? "#FF2D55" : "#A1A1AA",
                fontSize: "16px",
                letterSpacing: "-0.5px",
              }}
            >
              {formatCents(service.priceInCents)}
            </p>
          </div>
        );
      })}

      {/* Resumo e CTA */}
      <div
        className="mt-1 p-4 rounded-2xl flex flex-col gap-3"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          opacity: canContinue ? 1 : 0.5,
          transition: "opacity 0.2s",
        }}
      >
        {canContinue ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
                {formatCents(totalPrice)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#52525B" }}>
                {totalDuration} min · {selected.length}{" "}
                {selected.length === 1 ? "serviço" : "serviços"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className="px-5 py-2.5 rounded-xl font-black text-white text-sm transition-all hover:opacity-90"
              style={{
                background: "#FF2D55",
                boxShadow: "0 4px 16px rgba(255,45,85,0.3)",
              }}
            >
              Agendar →
            </button>
          </div>
        ) : (
          <p className="text-xs text-center" style={{ color: "#52525B" }}>
            Selecione ao menos um serviço para continuar
          </p>
        )}
      </div>
    </div>
  );
}
