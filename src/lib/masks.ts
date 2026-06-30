// src/lib/masks.ts
// Funções puras de máscara/parse/validação. Sem dependências externas.
// Convenção do projeto: telefone e CPF são PERSISTIDOS como dígitos; preços
// como inteiro de centavos (*InCents). Estas funções só cuidam de
// apresentação + parse + validação — nunca tocam no banco.

// ── Helpers ────────────────────────────────────────────────────────────────

/** Remove tudo que não for dígito. */
export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

// ── Telefone (BR) ───────────────────────────────────────────────────────────

/**
 * Formata telefone brasileiro de forma progressiva (enquanto digita).
 * 11 dígitos -> (DD) 9XXXX-XXXX ; 10 dígitos -> (DD) XXXX-XXXX.
 * Aceita string com lixo não-numérico (é limpa internamente). Cap em 11 dígitos.
 */
export function formatPhoneBR(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── Moeda (centavos) ─────────────────────────────────────────────────────────

/**
 * Formata um inteiro de centavos como "1.234,56" (pt-BR, sempre 2 casas).
 * Implementação manual a partir do inteiro para garantir round-trip exato
 * com parseInputToCents (sem float).
 */
export function formatCentsToBRL(cents: number): string {
  const n = Math.trunc(Math.abs(Number.isFinite(cents) ? cents : 0));
  const s = String(n).padStart(3, "0");
  const intPart = s.slice(0, -2);
  const decPart = s.slice(-2);
  const intWithSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intWithSep},${decPart}`;
}

/**
 * Converte o texto digitado num input de moeda para inteiro de centavos.
 * Strip de tudo que não é dígito (comportamento "caixa registradora":
 * digitar "1234" -> 1234 centavos -> exibe "12,34").
 */
export function parseInputToCents(input: string): number {
  const d = onlyDigits(input);
  if (!d) return 0;
  return parseInt(d, 10);
}

// ── CPF ──────────────────────────────────────────────────────────────────────

/**
 * Formata CPF de forma progressiva: 000.000.000-00. Cap em 11 dígitos.
 */
export function formatCPF(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Valida CPF pelos 2 dígitos verificadores. Rejeita comprimento != 11 e
 * sequências de dígitos iguais (00000000000, 11111111111, ...).
 */
export function isValidCPF(input: string): boolean {
  const d = onlyDigits(input);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== parseInt(d[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== parseInt(d[10], 10)) return false;

  return true;
}

// ── Aliases de compatibilidade ───────────────────────────────────────────────
// Nomes legados ainda usados em alguns pontos do código. formatPhoneBR/formatCPF
// já limpam a entrada, então funcionam como as antigas mask* (idempotentes).
export const maskPhone = formatPhoneBR;
export const maskCPF = formatCPF;
export const unmask = onlyDigits;
