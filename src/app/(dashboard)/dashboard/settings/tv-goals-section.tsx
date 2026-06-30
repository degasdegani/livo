"use client";

import { useState, useTransition } from "react";
import { GoalPeriod } from "@prisma/client";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  upsertBarbershopGoal,
  upsertProfessionalGoal,
  generateTvPin,
  revokeTvDevice,
} from "./actions";

// Tipos mínimos para os dados recebidos via props do Server Component pai
type GoalRow = { period: GoalPeriod; targetInCents: number };
type ProfGoalRow = { professionalId: string; period: GoalPeriod; targetServices: number };
type ProfRow = { id: string; name: string; goals: ProfGoalRow[] };
type DeviceRow = { id: string; label: string | null; lastSeenAt: Date | null };

interface Props {
  barbershopGoals: GoalRow[];
  professionals: ProfRow[];
  tvPin: string | null;
  devices: DeviceRow[];
}

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: "DAY", label: "Dia" },
  { value: "WEEK", label: "Semana" },
  { value: "MONTH", label: "Mes" },
];

export function TvGoalsSection({ barbershopGoals, professionals, tvPin, devices }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pin, setPin] = useState(tvPin);

  // ── Meta geral (valores em centavos) ────────────────────────────
  const [generalInputs, setGeneralInputs] = useState<Record<GoalPeriod, number>>({
    DAY: barbershopGoals.find((g) => g.period === "DAY")?.targetInCents ?? 0,
    WEEK: barbershopGoals.find((g) => g.period === "WEEK")?.targetInCents ?? 0,
    MONTH: barbershopGoals.find((g) => g.period === "MONTH")?.targetInCents ?? 0,
  });

  // Feedback "Salvo" momentâneo por botão (chave única por botão)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  function markSaved(key: string) {
    setSavedKeys((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setSavedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 2000);
  }

  function handleGeneralSave(period: GoalPeriod) {
    const value = generalInputs[period];
    if (isNaN(value) || value <= 0) return;
    startTransition(async () => {
      await upsertBarbershopGoal(period, value);
      markSaved(`general-${period}`);
    });
  }

  // ── Meta por profissional ────────────────────────────────────────
  const [profInputs, setProfInputs] = useState<Record<string, Record<GoalPeriod, string>>>(() => {
    const init: Record<string, Record<GoalPeriod, string>> = {};
    for (const p of professionals) {
      init[p.id] = {
        DAY: String(p.goals.find((g) => g.period === "DAY")?.targetServices ?? ""),
        WEEK: String(p.goals.find((g) => g.period === "WEEK")?.targetServices ?? ""),
        MONTH: String(p.goals.find((g) => g.period === "MONTH")?.targetServices ?? ""),
      };
    }
    return init;
  });

  function handleProfSave(professionalId: string, period: GoalPeriod) {
    const raw = profInputs[professionalId]?.[period] ?? "";
    const value = parseInt(raw, 10);
    if (isNaN(value) || value <= 0) return;
    startTransition(async () => {
      await upsertProfessionalGoal(professionalId, period, value);
      markSaved(`prof-${professionalId}-${period}`);
    });
  }

  // ── PIN ─────────────────────────────────────────────────────────
  function handleGeneratePin() {
    startTransition(async () => {
      const newPin = await generateTvPin();
      setPin(newPin);
    });
  }

  // ── Revogar device ───────────────────────────────────────────────
  function handleRevoke(deviceId: string) {
    startTransition(async () => {
      await revokeTvDevice(deviceId);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Meta geral */}
      <section>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "0.75rem", fontWeight: 600 }}>
          Meta Geral da Barbearia
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Faturamento alvo por periodo. Exibido apenas como percentual na TV (valor em R$ nunca aparece na tela).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {PERIODS.map(({ value, label }) => (
            <div key={value} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ color: "var(--text-secondary)", width: "5rem", fontSize: "0.875rem" }}>{label}</span>
              <CurrencyInput
                valueInCents={generalInputs[value]}
                onChange={(cents) =>
                  setGeneralInputs((prev) => ({ ...prev, [value]: cents }))
                }
                style={{
                  background: "var(--bg-card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.375rem",
                  color: "var(--text-primary)",
                  padding: "0.375rem 0.625rem",
                  width: "10rem",
                }}
              />
              {(() => {
                const key = `general-${value}`;
                const saved = savedKeys.has(key);
                return (
                  <button
                    onClick={() => handleGeneralSave(value)}
                    disabled={isPending}
                    style={{
                      background: saved ? "#16a34a" : "var(--color-primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.375rem",
                      padding: "0.375rem 0.875rem",
                      cursor: isPending ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      transition: "background 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      minWidth: "5rem",
                      justifyContent: "center",
                    }}
                  >
                    {saved ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l4 4 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Salvo
                      </>
                    ) : "Salvar"}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      </section>

      {/* Meta por profissional */}
      <section>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "0.75rem", fontWeight: 600 }}>
          Metas por Profissional
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Quantidade de servicos alvo por periodo.
        </p>
        {professionals.map((prof) => (
          <div
            key={prof.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            <p style={{ color: "var(--text-primary)", fontWeight: 500, marginBottom: "0.5rem" }}>
              {prof.name}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {PERIODS.map(({ value, label }) => (
                <div key={value} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)", width: "5rem", fontSize: "0.875rem" }}>{label}</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 20"
                    value={profInputs[prof.id]?.[value] ?? ""}
                    onChange={(e) =>
                      setProfInputs((prev) => ({
                        ...prev,
                        [prof.id]: { ...prev[prof.id], [value]: e.target.value },
                      }))
                    }
                    style={{
                      background: "var(--bg-card-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.375rem",
                      color: "var(--text-primary)",
                      padding: "0.375rem 0.625rem",
                      width: "7rem",
                    }}
                  />
                  {(() => {
                    const key = `prof-${prof.id}-${value}`;
                    const saved = savedKeys.has(key);
                    return (
                      <button
                        onClick={() => handleProfSave(prof.id, value)}
                        disabled={isPending}
                        style={{
                          background: saved ? "#16a34a" : "var(--color-primary)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "0.375rem",
                          padding: "0.375rem 0.875rem",
                          cursor: isPending ? "not-allowed" : "pointer",
                          fontSize: "0.875rem",
                          transition: "background 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          minWidth: "5rem",
                          justifyContent: "center",
                        }}
                      >
                        {saved ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7l4 4 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Salvo
                          </>
                        ) : "Salvar"}
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        ))}
        {professionals.length === 0 && (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            Nenhum profissional ativo cadastrado.
          </p>
        )}
      </section>

      {/* PIN da TV */}
      <section>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "0.75rem", fontWeight: 600 }}>
          PIN da TV
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Digite este PIN na tela livobarber.com.br/tv para parear a televisao. Apos parear, o PIN nao e solicitado novamente neste dispositivo.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "0.25rem",
              color: "var(--color-primary)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.25rem",
            }}
          >
            {pin ?? "------"}
          </span>
          <button
            onClick={handleGeneratePin}
            disabled={isPending}
            style={{
              background: "var(--bg-card-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "0.375rem",
              color: "var(--text-primary)",
              padding: "0.5rem 1rem",
              cursor: isPending ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
            }}
          >
            {pin ? "Regenerar PIN" : "Gerar PIN"}
          </button>
        </div>
      </section>

      {/* Devices pareados */}
      <section>
        <h3 style={{ color: "var(--text-primary)", marginBottom: "0.75rem", fontWeight: 600 }}>
          Dispositivos Pareados
        </h3>
        {devices.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            Nenhum dispositivo pareado ainda.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {devices.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                }}
              >
                <div>
                  <p style={{ color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
                    {d.label ?? "TV sem nome"}
                  </p>
                  {d.lastSeenAt && (
                    <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", margin: 0 }}>
                      Visto por ultimo em{" "}
                      {new Date(d.lastSeenAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRevoke(d.id)}
                  disabled={isPending}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "0.375rem",
                    color: "var(--color-primary)",
                    padding: "0.25rem 0.75rem",
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Revogar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
