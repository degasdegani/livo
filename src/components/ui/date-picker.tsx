"use client";

// src/components/ui/date-picker.tsx
// Seletor de data date-only (sem fuso). Usa o <input type="date"> nativo —
// leve e fluido — porém com o visual padrão do browser totalmente removido e
// reestilizado via CSS (underline suave + ícone custom + ring vermelho LIVO).
// O picker nativo do browser continua funcionando normalmente ao clicar.
//
// IMPORTANTE: toda a lógica de data (dateOnlyToUTC / dateOnlyToInputValue) vive
// em date-only.ts e nos componentes pais. Aqui o value é sempre "YYYY-MM-DD",
// exatamente o formato que o <input type="date"> usa nativamente — sem conversão.

import { useRef } from "react";

type DatePickerProps = {
  value: string; // "YYYY-MM-DD" ou ""
  onChange: (value: string) => void; // retorna "YYYY-MM-DD" ou ""
  placeholder?: string;
  disabled?: boolean;
};

// CSS global (dedupado pelo React via href+precedence). Aplica só na classe
// .livo-date-input, então não vaza para outros inputs.
const DATE_INPUT_CSS = `
.livo-date-field {
  position: relative;
  display: block;
  width: 100%;
}
.livo-date-input {
  width: 100%;
  height: 44px;
  padding: 0 40px 0 14px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 44px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  color-scheme: dark;
  transition: all 0.2s ease;
}
[data-theme="light"] .livo-date-input {
  background-color: rgba(0, 0, 0, 0.04);
  color-scheme: light;
}
.livo-date-input:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.livo-date-input:focus {
  border-color: #C8102E;
  box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.18);
}
.livo-date-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* Esconde o ícone nativo de calendário, mas mantém a área clicável à direita
   (ao clicar nessa faixa o picker nativo do browser abre normalmente). */
.livo-date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}
.livo-date-input::-webkit-datetime-edit {
  color: inherit;
}
.livo-date-input::-webkit-inner-spin-button,
.livo-date-input::-webkit-clear-button {
  display: none;
  -webkit-appearance: none;
}
/* Ícone SVG custom à direita — apenas visual, deixa o clique passar para o
   indicador nativo (que está por cima) abrir o picker. */
.livo-date-icon {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
}
`;

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <span className="livo-date-field">
      {/* React 19 dedupa <style> com href+precedence — injeta uma única vez. */}
      <style href="livo-date-picker" precedence="medium">
        {DATE_INPUT_CSS}
      </style>

      <input
        ref={inputRef}
        type="date"
        className="livo-date-input"
        value={value}
        disabled={disabled}
        // placeholder não é exibido por <input type="date"> nativo (ignorado
        // pelos browsers), mas mantido na assinatura/atributo por consistência.
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          // Texto herda a cor do tema quando preenchido; quando vazio, o
          // formato "dd/mm/aaaa" do browser fica suave (muted).
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
      />

      <span className="livo-date-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    </span>
  );
}
