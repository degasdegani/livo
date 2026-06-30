"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { formatCentsToBRL, parseInputToCents } from "@/lib/masks";

type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>;

interface CurrencyInputProps extends BaseProps {
  /** Estado interno em centavos (inteiro). */
  valueInCents: number;
  /** Emite o inteiro de centavos. */
  onChange: (cents: number) => void;
  /** Quando definido, renderiza com label/estilo do design system (.livo-input). */
  label?: string;
  error?: string;
  /** Exibe o prefixo "R$ " (padrão true). */
  showPrefix?: boolean;
}

/**
 * Input de moeda estilo caixa registradora: o estado é mantido em centavos,
 * exibe "R$ 1.234,56" e emite o inteiro de centavos. Digitar acrescenta dígitos
 * à direita; backspace remove o último dígito (parse só dos dígitos visíveis).
 * Se `name` for fornecido, emite um <input type="hidden"> com os centavos.
 */
export function CurrencyInput({
  valueInCents,
  onChange,
  label,
  error,
  name,
  showPrefix = true,
  placeholder,
  inputMode = "numeric",
  ...rest
}: CurrencyInputProps) {
  const display = `${showPrefix ? "R$ " : ""}${formatCentsToBRL(valueInCents)}`;
  const ph = placeholder ?? (showPrefix ? "R$ 0,00" : "0,00");

  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(parseInputToCents(e.target.value));
  }

  const hidden = name ? (
    <input type="hidden" name={name} value={valueInCents} />
  ) : null;

  if (label !== undefined || error !== undefined) {
    return (
      <>
        {hidden}
        <Input
          {...rest}
          label={label}
          error={error}
          type="text"
          inputMode={inputMode}
          placeholder={ph}
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
        placeholder={ph}
        value={display}
        onChange={handle}
      />
    </>
  );
}
