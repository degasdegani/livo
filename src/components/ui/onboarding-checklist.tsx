// src/components/ui/onboarding-checklist.tsx
// Server Component — sem "use client".
// Renderiza o checklist de configuração inicial. Retorna null quando tudo está concluído.

interface ChecklistStep {
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
}

interface OnboardingChecklistProps {
  steps: ChecklistStep[];
}

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;

  if (doneCount === total) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--color-primary-20)",
        backgroundColor: "var(--bg-card)",
      }}
    >
      {/* Header com progresso */}
      <div
        className="px-6 py-5"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary-10) 0%, transparent 80%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className="font-black text-base"
              style={{
                color: "var(--color-primary)",
                letterSpacing: "-0.2px",
              }}
            >
              Configure sua barbearia
            </p>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {doneCount === 0
                ? "Comece por aqui — leva menos de 2 minutos."
                : doneCount === 1
                  ? "Ótimo começo! Faltam mais 2 passos."
                  : "Quase lá! Só mais um passo."}
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <span
              className="font-black tabular-nums"
              style={{
                fontSize: "28px",
                color: "var(--color-primary)",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              {doneCount}/{total}
            </span>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              concluídos
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div
          className="rounded-full overflow-hidden"
          style={{ height: 5, backgroundColor: "var(--border)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: "var(--color-primary)",
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 0 8px var(--color-primary)",
            }}
          />
        </div>
      </div>

      {/* Lista de passos */}
      <div>
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="flex items-center gap-4 px-6 py-4"
            style={{
              borderBottom:
                i < steps.length - 1 ? "1px solid var(--border)" : "none",
              opacity: step.done ? 0.6 : 1,
            }}
          >
            {/* Indicador de estado */}
            <div
              className="shrink-0 rounded-full flex items-center justify-center font-bold text-xs"
              style={{
                width: 32,
                height: 32,
                backgroundColor: step.done
                  ? "rgba(0,212,160,0.15)"
                  : i === doneCount
                    ? "var(--color-primary-10)"
                    : "var(--bg-card-elevated)",
                border: step.done
                  ? "1.5px solid var(--status-green)"
                  : i === doneCount
                    ? "1.5px solid var(--color-primary)"
                    : "1.5px solid var(--border)",
                color: step.done
                  ? "var(--status-green)"
                  : i === doneCount
                    ? "var(--color-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              {step.done ? "✓" : i + 1}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold"
                style={{
                  color: step.done
                    ? "var(--text-tertiary)"
                    : "var(--text-primary)",
                  textDecoration: step.done ? "line-through" : "none",
                }}
              >
                {step.label}
              </p>
              {!step.done && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {step.description}
                </p>
              )}
            </div>

            {/* CTA */}
            {!step.done && (
              <a
                href={step.href}
                className="shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
                style={{
                  backgroundColor:
                    i === doneCount
                      ? "var(--color-primary)"
                      : "var(--bg-card-elevated)",
                  color:
                    i === doneCount ? "white" : "var(--text-secondary)",
                  border:
                    i === doneCount
                      ? "none"
                      : "1px solid var(--border)",
                }}
              >
                {step.cta}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
