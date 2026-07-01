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
