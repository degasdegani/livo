# ADR-003 — Migração de Rate Limiting para Store Distribuído (Upstash Redis)

**Status:** Aceito
**Data:** 09/07/2026
**Ticket relacionado:** LIVO-005
**Decisor:** Eduardo Degani (founder/CTO)

---

## Contexto

O diagnóstico read-only do LIVO-005 (rate limiting em endpoints públicos) revelou que
o mecanismo de rate limit já existente no projeto — implementado de forma independente
em 6 arquivos (`src/auth.ts`, `forgot-password/actions.ts`, `[slug]/book/actions.ts`,
`[slug]/clube/actions.ts` + `otp-clube.ts`, `api/livia/route.ts`, `tv/api/pair/route.ts`)
— usa um padrão de `Map<string, {count, resetAt}>` em memória de módulo.

Esse padrão não sobrevive à infraestrutura real de produção (Vercel serverless):
cada instância/cold start tem seu próprio Map, isolado das demais. Na prática, o
rate limit existente não impede um atacante distribuído (ou requisições atingindo
instâncias diferentes) de ultrapassar o limite configurado — o mecanismo aparenta
funcionar, mas não cumpre a função de segurança prometida sob carga real.

O mesmo diagnóstico identificou 3 endpoints públicos sem nenhum rate limit:
`reset-password/actions.ts` (consumo de token — superfície de força bruta),
`register/actions.ts` (criação de conta) e `vip/actions.ts` (lead capture,
grava na tabela protegida `WaitlistLead`).

## Decisão

Migrar o mecanismo de rate limiting para um store distribuído — **Upstash Redis**,
via `@upstash/ratelimit` + `@upstash/redis` — compatível com Edge Runtime e
serverless, mesma stack de deploy (Vercel).

Escopo da migração:

- Fechar os 3 gaps identificados usando a nova abstração desde o início (nunca
  usando o padrão Map, que seria institucionalizar o atalho pela terceira vez).
- Migrar os 6 endpoints já existentes para a mesma abstração central, no mesmo
  ciclo de trabalho, para evitar inconsistência arquitetural (endpoints "corretos"
  ao lado de endpoints "sabidamente quebrados").

### Comportamento em caso de indisponibilidade do Redis: Fail-Open

Caso o Upstash Redis esteja indisponível (timeout, erro de rede), a decisão é
**deixar a requisição passar** (não bloquear login/registro/reset por conta de
uma dependência externa secundária fora do ar), registrando o evento via
`@/lib/logger` para visibilidade.

Trade-off aceito conscientemente: prioriza disponibilidade do produto sobre
proteção adicional durante uma janela rara e transitória de indisponibilidade
de terceiro. Alternativa descartada: fail-closed (bloquear tudo até o Redis
voltar) — rejeitada por criar um novo ponto único de falha capaz de derrubar
login/registro de toda a base por causa de uma peça secundária.

### Alternativas descartadas

- **Manter Map em memória:** rejeitado — não cumpre a função de segurança em
  produção, conforme diagnosticado.
- **Usar Postgres/Neon como store de contador:** rejeitado — overhead de latência
  e escrita para dado transitório/efêmero; Redis é o padrão de mercado para este
  caso de uso, e a stack já é 100% serverless/Vercel, tornando Upstash (HTTP-based,
  sem gerenciamento de conexão) a escolha natural.

## Custo

Plano gratuito da Upstash: 500.000 comandos/mês, sem cartão de crédito, sem
histórico de mudança de preço. Volume atual do LIVO é uma fração pequena desse
limite — custo esperado: $0,00.

## Consequências

- Novo arquivo central: `src/lib/rate-limit.ts` (client Upstash lazy, mesmo
  padrão de `src/lib/posthog.ts`).
- Novas env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, ambas
  `critical: false` em `src/lib/env.ts` (coerente com a decisão de fail-open —
  se fossem `critical: true`, o boot quebraria sem a env var, contradizendo o
  próprio design).
- Nova dependência externa de terceiro (Upstash) no caminho crítico de
  login/registro/reset — mitigado pelo fail-open.
- Débito técnico eliminado: os 6 rate limits pré-existentes, que aparentavam
  funcionar mas não funcionavam sob a infraestrutura real de produção.
