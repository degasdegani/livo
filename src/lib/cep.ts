// src/lib/cep.ts
// Máscara de CEP e consulta ViaCEP. Extraído do onboarding para reuso em
// Configurações (completar cadastro). Sem dependências externas.

import { onlyDigits } from "@/lib/masks";

/** Formata CEP progressivamente enquanto digita: 00000-000. */
export function maskCEP(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, "$1-$2").replace(/-$/, "");
}

export interface CEPResult {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

/** Consulta ViaCEP. Retorna null em CEP incompleto, inexistente ou erro de rede. */
export async function fetchCEP(cep: string): Promise<CEPResult | null> {
  const clean = onlyDigits(cep);
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
