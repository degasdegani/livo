"use client";

// src/components/ui/date-picker.tsx
// Seletor de data date-only (sem fuso) com 3 colunas: Dia | Mês | Ano.
// Não usa <input type="date"> nativo. Toda a lógica de data vem de date-only.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import { dateOnlyToInputValue, formatDateOnly } from "@/lib/date-only";

type DatePickerProps = {
  value: string; // "YYYY-MM-DD" ou ""
  onChange: (value: string) => void; // retorna "YYYY-MM-DD" ou ""
  placeholder?: string;
  disabled?: boolean;
};

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

function parseValue(value: string): {
  day: number | null;
  month: number | null;
  year: number | null;
} {
  if (!value) return { day: null, month: null, year: null };
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return { day: null, month: null, year: null };
  return { day: d, month: m, year: y };
}

function buildValue(
  day: number | null,
  month: number | null,
  year: number | null,
): string {
  if (!day || !month || !year) return "";
  // Normaliza via date-only.ts (garante meia-noite UTC -> "YYYY-MM-DD").
  return dateOnlyToInputValue(new Date(Date.UTC(year, month - 1, day)));
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const parsed = parseValue(value);
  const [day, setDay] = useState<number | null>(parsed.day);
  const [month, setMonth] = useState<number | null>(parsed.month);
  const [year, setYear] = useState<number | null>(parsed.year);

  const anos = useMemo(() => {
    const atual = new Date().getFullYear();
    const lista: number[] = [];
    for (let y = atual; y >= 1940; y--) lista.push(y);
    return lista;
  }, []);

  // Sincroniza estado interno ao abrir (reflete o value externo atual).
  useEffect(() => {
    if (open) {
      const p = parseValue(value);
      setDay(p.day);
      setMonth(p.month);
      setYear(p.year);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
  }, [open, value]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function commit(
    nextDay: number | null,
    nextMonth: number | null,
    nextYear: number | null,
  ) {
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
    if (nextDay && nextMonth && nextYear) {
      onChange(buildValue(nextDay, nextMonth, nextYear));
      setOpen(false);
    }
  }

  function handleClear() {
    setDay(null);
    setMonth(null);
    setYear(null);
    onChange("");
    setOpen(false);
  }

  const display = value ? formatDateOnly(value) : "";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="livo-input"
        style={{
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          color: display ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
      >
        {display || placeholder}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: "#17171C",
            border: "1px solid #2A2A33",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            overflow: "hidden",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-6px)",
            transition: "opacity 140ms ease, transform 140ms ease",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              height: 200,
            }}
          >
            <DateColumn
              items={DIAS.map((d) => ({
                key: d,
                label: String(d).padStart(2, "0"),
              }))}
              active={day}
              onPick={(d) => commit(d, month, year)}
            />
            <DateColumn
              items={MESES.map((label, i) => ({ key: i + 1, label }))}
              active={month}
              onPick={(m) => commit(day, m, year)}
              borderLeft
            />
            <DateColumn
              items={anos.map((y) => ({ key: y, label: String(y) }))}
              active={year}
              onPick={(y) => commit(day, month, y)}
              borderLeft
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid #2A2A33",
              padding: "8px 10px",
            }}
          >
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                fontSize: 12,
                cursor: "pointer",
                padding: "4px 6px",
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateColumn({
  items,
  active,
  onPick,
  borderLeft,
}: {
  items: { key: number; label: string }[];
  active: number | null;
  onPick: (key: number) => void;
  borderLeft?: boolean;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center" });
    }
    // Centraliza o item ativo ao montar a coluna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={colRef}
      className="date-picker-col"
      style={{
        overflowY: "auto",
        borderLeft: borderLeft ? "1px solid #2A2A33" : undefined,
        padding: "6px 0",
      }}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onPick(item.key)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "7px 0",
              fontSize: 13,
              border: "none",
              cursor: "pointer",
              backgroundColor: isActive ? "#C8102E" : "transparent",
              color: isActive ? "#FFFFFF" : "var(--text-secondary)",
              fontWeight: isActive ? 600 : 400,
              transition: "background-color 120ms ease, color 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.backgroundColor = "#1F1F27";
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
