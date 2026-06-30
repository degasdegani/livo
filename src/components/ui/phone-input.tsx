"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneBR, onlyDigits } from "@/lib/masks";

type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>;

interface PhoneInputProps extends BaseProps {
  /** Valor em dígitos (pode vir com máscara — é limpo internamente). */
  value: string;
  /** Emite SÓ dígitos (até 11). */
  onChange: (digits: string) => void;
  /** Quando definido, renderiza com label/estilo do design system (.livo-input). */
  label?: string;
  error?: string;
}

/**
 * Input de telefone controlado: armazena/emite só dígitos, exibe mascarado.
 * Se `name` for fornecido, emite um <input type="hidden"> com os dígitos para
 * envio via FormData (o input visível não carrega name).
 */
export function PhoneInput({
  value,
  onChange,
  label,
  error,
  name,
  placeholder = "(16) 99999-9999",
  inputMode = "tel",
  ...rest
}: PhoneInputProps) {
  const digits = onlyDigits(value).slice(0, 11);
  const display = formatPhoneBR(digits);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(onlyDigits(e.target.value).slice(0, 11));
  }

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
          error={error}
          type="tel"
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
        type="tel"
        inputMode={inputMode}
        placeholder={placeholder}
        value={display}
        onChange={handle}
      />
    </>
  );
}
