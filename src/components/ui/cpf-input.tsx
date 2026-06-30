"use client";

import { type ChangeEvent, type InputHTMLAttributes, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/masks";

type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>;

interface CPFInputProps extends BaseProps {
  /** Valor em dígitos (pode vir com máscara — é limpo internamente). */
  value: string;
  /** Emite SÓ dígitos (até 11). */
  onChange: (digits: string) => void;
  /** Notifica a validade atual (útil para o form gatear o submit). */
  onValidityChange?: (valid: boolean) => void;
  /** Mostra erro inline "CPF inválido" quando 11 dígitos não validam (padrão true). */
  showError?: boolean;
  /** Texto do erro inline. */
  errorText?: string;
  /** Quando definido, renderiza com label/estilo do design system (.livo-input). */
  label?: string;
  /** Erro externo — tem prioridade sobre o erro de validação interno. */
  error?: string;
}

/**
 * Input de CPF controlado: armazena/emite só dígitos, exibe mascarado e expõe
 * o estado de validade (2 dígitos verificadores). Mostra "CPF inválido" inline
 * quando há 11 dígitos que não validam.
 * Se `name` for fornecido, emite um <input type="hidden"> com os dígitos.
 */
export function CPFInput({
  value,
  onChange,
  onValidityChange,
  showError = true,
  errorText = "CPF inválido",
  label,
  error,
  name,
  placeholder = "000.000.000-00",
  inputMode = "numeric",
  ...rest
}: CPFInputProps) {
  const digits = onlyDigits(value).slice(0, 11);
  const display = formatCPF(digits);
  const valid = isValidCPF(digits);

  const cbRef = useRef(onValidityChange);
  cbRef.current = onValidityChange;
  useEffect(() => {
    cbRef.current?.(valid);
  }, [valid]);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(onlyDigits(e.target.value).slice(0, 11));
  }

  const invalid = digits.length === 11 && !valid;
  const computedError =
    error ?? (showError && invalid ? errorText : undefined);

  const hidden = name ? (
    <input type="hidden" name={name} value={digits} />
  ) : null;

  if (label !== undefined || error !== undefined) {
    return (
      <>
        {hidden}
        <Input
          {...rest}
          label={label}
          error={computedError}
          type="text"
          inputMode={inputMode}
          placeholder={placeholder}
          value={display}
          onChange={handle}
        />
      </>
    );
  }

  return (
    <>
      {hidden}
      <input
        {...rest}
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={display}
        onChange={handle}
        aria-invalid={computedError ? "true" : undefined}
      />
      {computedError && (
        <p style={{ fontSize: 12, color: "var(--status-red, #ef4444)", marginTop: 4 }}>
          {computedError}
        </p>
      )}
    </>
  );
}
