import { PlanStatus } from "@prisma/client";

// Portão suave da confirmação de e-mail (B1.3).
//
// Regra: bloqueia apenas quando o e-mail do dono NÃO está confirmado
// (emailVerified === null). Exceções que NUNCA são bloqueadas:
//   - planStatus === lifetime: regra inviolável (ex.: TX Barbearia, conta
//     antiga que pode ter emailVerified null por preceder a B1.2). A isenção
//     protege a TX por design, sem depender do valor vivo de emailVerified.
//   - Login por Google: emailVerified já é populado pelo events.createUser
//     (B1.2), então cai naturalmente no caminho liberado — sem lógica extra.
//
// Função pura (sem Prisma) — segura para importar em qualquer runtime.
export function isEmailGateBlocked(input: {
  planStatus: PlanStatus;
  emailVerified: Date | null;
}): boolean {
  if (input.planStatus === PlanStatus.lifetime) return false;
  return input.emailVerified === null;
}
