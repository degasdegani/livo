import { PlanStatus } from "@prisma/client";

// Versão vigente dos documentos legais (Termos de Uso + Política de Privacidade
// + Termo de Tratamento de Dados). Versão INICIAL — rascunho pendente de revisão
// jurídica. Quando o texto final for aprovado, basta incrementar esta string:
// como isTermsPending compara string direta (sem semver), a mudança dispara
// re-aceite automático de todos os usuários no próximo acesso (gate da B2.3).
export const CURRENT_TERMS_VERSION = "2026-07-01";

// O aceite é tratado como PACOTE ÚNICO ("bundle"): um checkbox, uma versão,
// cobrindo Termos + Privacidade + Tratamento de Dados. Simplifica o gate
// (uma comparação de versão) e evita estados de aceite parcial.
export const TERMS_DOCUMENT_TYPE = "bundle";

// Mensagem de erro exibida quando o Prisma detecta P2003 (userId da sessão
// não existe mais em "users") ao gravar o aceite. Compartilhada entre a
// Server Action (retorno de erro) e o client component (decide se mostra o
// link para /login), para as duas pontas nunca divergirem.
export const SESSION_EXPIRED_ERROR = "Sua sessão expirou. Faça login novamente.";

// Helper puro de decisão (espelho de isEmailGateBlocked, B1.3): sem registro
// (null) ou versão diferente da vigente => aceite pendente. Comparação de
// string direta, sem lógica semver. Sem Prisma/headers — seguro em qualquer
// runtime (inclui o gate da B2.3 e componentes client).
export function isTermsPending(
  acceptedVersion: string | null,
  currentVersion: string = CURRENT_TERMS_VERSION,
): boolean {
  return acceptedVersion !== currentVersion;
}

// Gate de aceite (espelho de isEmailGateBlocked, B1.3): isenção ESTRUTURAL para
// planStatus lifetime (TX Barbearia) — nunca por identidade hardcoded. Demais
// contas: bloqueadas enquanto o aceite estiver pendente. Função pura.
export function isTermsGateBlocked(input: {
  planStatus: PlanStatus | null;
  lastAcceptedVersion: string | null;
}): boolean {
  if (input.planStatus === PlanStatus.lifetime) return false;
  return isTermsPending(input.lastAcceptedVersion);
}
