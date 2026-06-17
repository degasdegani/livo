"use client";

import { Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Professional {
  id: string;
  name: string;
}

export interface ProfessionalFilterProps {
  professionals: Professional[];
  /** IDs dos profissionais a mostrar. Vazio = todos. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// ProfessionalFilter
// ══════════════════════════════════════════════════════════════════════════════

export function ProfessionalFilter({
  professionals,
  selectedIds,
  onChange,
}: ProfessionalFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Não exibe filtro quando há apenas 1 profissional (barber, ou barbershop com 1 prof)
  if (professionals.length <= 1) return null;

  // selectedIds vazio = "todos selecionados" (sem filtro ativo)
  const isFiltered = selectedIds.length > 0;
  const effective = isFiltered ? selectedIds : professionals.map((p) => p.id);

  function isChecked(id: string) {
    return effective.includes(id);
  }

  function toggleAll() {
    onChange([]);
    setOpen(false);
  }

  function clearFilter() {
    onChange([]);
    setOpen(false);
  }

  function toggle(id: string) {
    const allIds = professionals.map((p) => p.id);
    let next: string[];
    if (effective.includes(id)) {
      next = effective.filter((x) => x !== id);
      // Previne seleção vazia — reseta para todos
      if (next.length === 0) { onChange([]); return; }
    } else {
      next = [...effective, id];
    }
    // Se todos estão selecionados, representa como []
    onChange(next.length === allIds.length ? [] : next);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Botão de abertura */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          border: "1px solid var(--border)",
          color: isFiltered ? "var(--color-primary)" : "var(--text-secondary)",
          backgroundColor: isFiltered
            ? "rgba(var(--color-primary-rgb, 99,102,241), 0.08)"
            : undefined,
        }}
        aria-label="Filtrar profissionais"
        aria-expanded={open}
      >
        <Filter size={13} />
        <span>Filtrar</span>
        {isFiltered && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white leading-none"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {selectedIds.length}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-xl"
          style={{
            minWidth: 200,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Ações de topo */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              Profissionais
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--color-primary)" }}
              >
                Selecionar todos
              </button>
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="text-xs font-medium transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Lista de profissionais com checkboxes */}
          <div className="py-1 max-h-52 overflow-y-auto">
            {professionals.map((prof) => {
              const checked = isChecked(prof.id);
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => toggle(prof.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "")
                  }
                >
                  {/* Checkbox customizado */}
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
                    style={{
                      border: checked ? "none" : "1.5px solid var(--border)",
                      backgroundColor: checked ? "var(--color-primary)" : undefined,
                    }}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{prof.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
