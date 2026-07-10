# LIVO — BACKLOG DE ENGENHARIA E PRODUTO

Documento gerado pelo CTO/PM Assistente do ecossistema LIVO.
Base: LIVO_INDEX → LIVO_OPERATING_SYSTEM → LIVO_DECISION_FRAMEWORK + estado atual conhecido do projeto (SALA Tecnologia / LIVO BARBER).

> Observação de origem: os tickets abaixo foram derivados do estado conhecido do projeto (features em produção, itens do "Grupo D", decisões de negócio pendentes, riscos técnicos documentados como aprendizados). Nesta atualização (10/07/2026), o LIVO-040 e o LIVO-041 foram concluídos e validados em produção, e um novo ticket de débito técnico (LIVO-048) foi identificado durante o diagnóstico do LIVO-041.

---

## 1. BUGS

### LIVO-034 — [CONCLUÍDO 09/07/2026] Footer duplicado em /produto e /planos

**Status:** ✅ Resolvido e deployado (branch preview/redesign-institucional, mesclado em main).
**Problema que era:** `PublicFooter` (src/components/public-footer.tsx) tinha uma denylist de rotas onde não deveria renderizar, mas não incluía `/produto` e `/planos` — essas rotas renderizavam tanto o `Footer` da landing quanto o `PublicFooter` empilhados na mesma página. Bug pré-existente desde o commit 15107c9 (extração de /produto e /planos da Home), exposto durante a execução do LIVO-032-A.
**O que foi feito:** Adicionado `/produto` e `/planos` à denylist de `PublicFooter`, mesma lógica já usada para `/`. Verificado que `/oferta-30-dias`, `/oferta-60-dias` e `/vip` não tinham o mesmo problema.
**Validação:** `npx tsc --noEmit` limpo, confirmado visualmente em preview do Vercel.

### LIVO-040 — [CONCLUÍDO 10/07/2026] CTA "Começar agora" direcionava para /onboarding sem sessão ativa

**Status:** ✅ Resolvido e validado em produção.
**Problema que era:** Os CTAs "Começar agora"/"Criar conta" do site institucional apontavam diretamente para `/onboarding` (rota antiga, que exige CPF/data de nascimento logo na primeira tela), não para `/cadastro` (fluxo unificado do LIVO-009). Como `/onboarding` assume `session.user.id` já existente e redireciona para `/login` quando não há sessão, um visitante sem conta que clicasse em qualquer CTA caía nesse redirect intermediário em vez de ir direto para o cadastro.
**Diagnóstico:** mapeamento completo via `Get-ChildItem -Recurse | Select-String -Pattern "/onboarding"` revelou **6 pontos de entrada de marketing** apontando para a rota errada (2 a mais do que o suspeitado inicialmente):

1. `src/components/landing/navbar.tsx:84` (CTA desktop)
2. `src/components/landing/navbar.tsx:149` (CTA mobile)
3. `src/components/landing/footer.tsx:12` (link "Criar conta")
4. `src/components/landing/hero.tsx:226` (botão do banner principal)
5. `src/components/landing/plans.tsx:33` (card do plano Start)
6. `src/components/landing/plans.tsx:56` (card do plano Pro)

Identificados também **4 ocorrências de categoria diferente**, deliberadamente não alteradas neste ticket: `settings/page.tsx:49`, `dashboard/page.tsx:104,114` e `permissions.ts:55` — todos tratam do gate interno "usuário já logado, mas sem `Membership`/`Barbershop`", um cenário distinto de visitante novo, que merece decisão própria no futuro (não é dead code, e trocar cegamente para `/cadastro` poderia gerar comportamento inesperado para quem já está autenticado).

**O que foi feito:** Trocado `href`/`ctaHref` de `/onboarding` para `/cadastro` nos 6 pontos de marketing listados acima. Nenhuma outra lógica alterada.
**Branch:** `feature/livo-040-cta-cadastro`, commit `377b32e`.
**Validação:** `npx tsc --noEmit` limpo a cada arquivo alterado (0 erros). Testado manualmente em preview e depois em produção (`livobarber.com.br`) — os 6 pontos confirmados levando à tela nova de `/cadastro` (sem CPF, sem trava), pelo próprio founder.
**Merge:** `--no-ff` em `main`.
**Nota:** o gate interno (4 ocorrências acima) fica registrado como possível ticket futuro, sem urgência — não bloqueia nada hoje.

### LIVO-041 — [CONCLUÍDO 10/07/2026] Bug de produção em /aceitar-termos (loop de sessão órfã) + checkbox obrigatório de termos

**Status:** ✅ Resolvido, reproduzido ao vivo pelo founder em produção, corrigido e revalidado.

**Contexto original:** reportado em 10/07/2026 com print de erro genérico ("Algo deu errado", código `1733371965`) e log do Vercel confirmando `PrismaClientKnownRequestError` código `P2003` (foreign key violation) em `prisma.termsAcceptance.create()`. Hipótese inicial era de que o bug fosse exclusivo do fluxo Google OAuth — **diagnóstico real mostrou causa diferente e mais ampla** (ver abaixo).

**Causa raiz real:** o erro `P2003` acontece sempre que a Server Action `recordTermsAcceptance` tenta gravar um aceite de termos referenciando um `userId` que não existe mais na tabela `users` — uma "sessão órfã/zumbi". Isso ocorre porque a sessão usa estratégia JWT (Auth.js v5): o cookie de sessão permanece criptograficamente válido mesmo que o usuário correspondente tenha sido removido do banco por qualquer motivo (neste caso, uma conta de teste órfã removida manualmente durante o diagnóstico — ver "Achado colateral" abaixo). Não é exclusivo do fluxo Google; acontece com qualquer sessão que sobreviva à remoção do usuário.

**Achado importante durante o diagnóstico:** o gate de termos (`requireTermsAccepted()`, em `src/lib/terms-gate.ts`, chamado em `src/app/(dashboard)/layout.tsx`) **já existia e já estava ativo** desde o commit `7210947` ("B2.3"). O comentário em `src/app/aceitar-termos/page.tsx` dizendo "sem gate, B2.3 é trabalho futuro" estava simplesmente desatualizado (confirmado via `git merge-base --is-ancestor`) — o gate funciona normalmente para o caso comum (termos pendentes → redireciona para `/aceitar-termos`). O problema real era só o tratamento do erro de sessão órfã dentro dessa tela.

**O que foi feito, em 4 etapas:**

1. **Checkbox obrigatório de termos** (commit `2318dd5`, branch `feature/livo-041-termos-checkbox-gate`): em `src/app/(auth)/cadastro/page.tsx` e `src/app/aceitar-termos/accept-form.tsx`, o botão de submit passou a ficar desabilitado (visualmente acinzentado) até o checkbox de aceite ser marcado — via `useState` client-side controlando a prop `disabled` do `SubmitButton`, mantendo a validação server-side já existente (`formData.get("acceptTerms"/"accept") !== "on"`) intacta como defesa em profundidade.

2. **Primeira tentativa de tratamento do erro P2003** (commit `f0421eb`, mesma branch): capturou o erro específico e retornava `{ error: "Sua sessão expirou. Faça login novamente." }` com um link `<Link href="/login">`. **Insuficiente na prática** — o clique no link não encerrava a sessão de verdade, causando um **loop reproduzido ao vivo em produção pelo founder**: `/aceitar-termos` → clique em "Ir para o login" → URL passa rapidamente por `/dashboard` → volta para `/aceitar-termos` (o middleware/lógica de auth via cookie ainda "válido" redirecionava de volta para dentro do sistema, que por sua vez detectava termos pendentes de novo).

3. **Limpeza de comentário desatualizado** (commit `4e210be`, mesma branch): atualizado o comentário em `src/app/aceitar-termos/page.tsx` para refletir que o gate B2.3 está ativo, removendo a menção a "trabalho futuro".

4. **Correção definitiva** (commit `e5d7535`, branch `fix/livo-041-signout-sessao-orfa`): substituída a abordagem do passo 2 — em vez de retornar um erro com link, o catch de `P2003` em `src/app/aceitar-termos/actions.ts` agora chama `await signOut({ redirectTo: "/login" })` (mesmo padrão server-side já usado em `src/app/(onboarding)/onboarding/actions.ts`), encerrando a sessão de fato no servidor antes do redirect. Como consequência, removidos por não terem mais uso: o link condicional "Ir para o login" em `accept-form.tsx` e a constante `SESSION_EXPIRED_ERROR` em `src/lib/terms.ts` (criada e removida na mesma sessão, após uma correção de duplicação identificada em revisão — a constante chegou a ser declarada localmente em dois arquivos por engano do Claude Code antes de ser centralizada corretamente em `src/lib/terms.ts`, e depois removida por completo quando a abordagem mudou para `signOut`).

**Achado colateral tratado à parte:** durante o diagnóstico, identificada uma conta de teste órfã (`eduardodegani97@gmail.com`, id `cmr2fmzxg000043uk5pospiv1`, sem `Membership`/`Barbershop`/`Accounts`/`Sessions`, só 1 `terms_acceptances`) cujo CPF pertencia à conta principal do founder (`contatodegani@gmail.com`, id `cmq52jmvv0000qu3dp7e4zh3y`), causando bloqueio de unicidade de CPF ao tentar completar o cadastro antigo. Removida via transação `BEGIN`/`DELETE`/`SELECT`/`COMMIT` no Neon SQL Editor, confirmando zero dependências antes do delete. TX Barbearia e WaitlistLeads não tocados. Essa remoção foi o que expôs a sessão zumbi que revelou o bug real do LIVO-041 (o navegador do founder mantinha um cookie de sessão referenciando o `userId` recém-apagado).

**Branches:** `feature/livo-041-termos-checkbox-gate` (commits `2318dd5`, `f0421eb`, `4e210be`) + `fix/livo-041-signout-sessao-orfa` (commit `e5d7535`), ambos mesclados `--no-ff` em `main`.
**Validação final em produção:** o founder reproduziu o cenário exato (mesma conta com sessão órfã, mesmo navegador) após o deploy da correção definitiva — confirmado que o `signOut` real interrompe o loop por completo: o clique em "Li e aceito, continuar" (com sessão órfã) agora leva direto e limpo a `/login`, sem passar por `/dashboard` nem retornar a `/aceitar-termos`. Testado também: fechar e reabrir o navegador, "Entrar" vai para `/login`, "Começar agora" vai para `/cadastro` — ambos os fluxos corretos.
**`npx tsc --noEmit`:** limpo (0 erros) em cada etapa/commit.

### LIVO-001 — Nenhum bug ativo adicional reportado

**Objetivo:** Manter rastreabilidade de defeitos.
**Prioridade:** N/A
**Passos técnicos:** Aguardando input adicional.

---

## 2. SEGURANÇA

### LIVO-002 — Auditoria de validação de assinatura do webhook Asaas

**Status:** ⏸️ **Pausado por decisão do founder (09/07/2026).** Faz parte do bloco Asaas (junto com LIVO-030) — retomar apenas quando a conta PJ estiver com documentos 100% aprovados. Não iniciar isoladamente antes disso.
**Objetivo:** Garantir que apenas requisições autênticas da Asaas sejam processadas.
**Problema atual:** Não há confirmação registrada de que o endpoint de webhook valida assinatura/token de origem antes de processar eventos de billing.
**Impacto no negócio:** Risco de fraude de billing (falsos eventos de pagamento/cancelamento afetando `planStatus`).
**Prioridade:** Crítica (retomada) — hoje pausada por decisão de negócio
**Complexidade:** Pequena
**Dependências:** Bloco Asaas liberado (ver LIVO-030)
**Critérios de aceite:** Requisições sem assinatura/token válido são rejeitadas com 401 antes de qualquer leitura no banco; teste automatizado cobre caso de payload forjado.
**Passos técnicos de implementação:**

1. Diagnóstico read-only: localizar rota do webhook Asaas e verificar se há checagem de header/token.
2. Se ausente, implementar validação conforme doc oficial da Asaas.
3. Adicionar teste (Vitest) simulando payload sem assinatura.
4. Validar em produção (Vercel) com evento de teste.

### LIVO-003 — [CONCLUÍDO 09/07/2026] Auditoria LGPD: exportação e exclusão de dados do titular

**Status:** ✅ Resolvido, testado e validado em produção. Primeiro ticket executado via branch de feature isolada + preview deployment antes do merge.
**Diagnóstico prévio (read-only):** confirmou que não existia nenhuma função de exportação, anonimização ou exclusão de titular no código — apesar da página `/privacidade` prometer explicitamente esses direitos (LGPD art. 18). Mapeamento de `onDelete` real no banco (via Neon, não só schema): `appointments.clientId` e `comandas.clientId` = `SET NULL`; `client_packages.clientId` e `client_subscriptions.clientId` = `RESTRICT` — confirmando que hard-delete de `Client` é tecnicamente inviável (quebra com FK violation se houver pacote/assinatura vinculado). Estratégia definida: **anonimização in-place, nunca delete**.
**O que foi feito:**

1. Migration aditiva: campo `anonymizedAt DateTime?` no model `Client`. `migrate diff` confirmou apenas `ADD COLUMN`, sem DROP.
2. `anonymizeClient(clientId, barbershopId)` em `src/app/(dashboard)/dashboard/clients/actions.ts`:
   - `requireRole("owner")` + checagem `membership.barbershopId === barbershopId` antes de qualquer mutação (protege contra owner de outra conta anonimizar cliente alheio).
   - `$transaction(async (tx) => {...})`: `Client.update` (name → "Cliente Removido"; phone/email/cpf/birthDate/cep/neighborhood/street/notes → null ou placeholder; `anonymizedAt` preenchido) + `Appointment.updateMany` (limpa snapshot `clientName`/`clientPhone`/`clientEmail`) + `Comanda.updateMany` (limpa snapshot `clientName`).
   - **Desvio necessário do plano original:** `phone` é `String` obrigatório e único junto com `barbershopId` no schema — não aceita `null`. Resolvido com placeholder determinístico `anonimizado-${clientId}`, que satisfaz `NOT NULL` e nunca colide com o unique constraint entre anonimizações sucessivas.
   - Nunca toca `ComandaItem`, `ComandaPayment`, `ClientSubscription`, `ClientPackage`, `WaitlistLead`, `Barbershop`.
   - Comentário explícito no código sobre por que não há guard de `planStatus=lifetime` aqui: a isenção da TX Barbearia é sobre a barbearia nunca ser bloqueada/cobrada, não sobre o direito de um cliente individual pedir remoção — não confundir com os guards de billing já existentes.
3. `exportClientData(clientId, barbershopId)`: read-only, mesmo guard de owner + tenant, agrega `Client` + `Appointment[]` + `Comanda[]` (com items/payments) + `ClientSubscription[]` (com plan/usages) + `ClientPackage[]` (com items/package), tudo escopado por `clientId` e `barbershopId`.
4. Corrigido `tests/factories/client.factory.ts` para incluir o novo campo `anonymizedAt`.

**Mudança de processo (primeira vez aplicada):** branch de feature `feature/livo-003-lgpd-anonimizacao` criada, commit isolado (sem `LIVO_BACKLOG.md` nem alterações não relacionadas), push, preview deployment gerado automaticamente pela integração Git↔Vercel, validado antes do merge em `main`. Quebra a sequência de 3 ciclos anteriores (LIVO-008, LIVO-013, LIVO-005) com push direto em produção.

**Validação:**

- `npx tsc --noEmit` → 0 erros (antes e depois do merge em `main`).
- Suítes de teste existentes (mt-clients, clientes-performance, infrastructure) → 49 testes passando, nenhuma regressão.
- Teste real contra a conta Vortex no Neon (script temporário, removido ao final, sem resíduo no repositório nem no banco): Client de teste com Appointment + Comanda/ComandaItem + ClientSubscription + ClientPackage vinculados.
  - Cross-tenant (barbershopId errado) → `{ error: "Cliente não encontrado." }`, nenhum dado alterado.
  - Anonimização correta → todos os campos pessoais limpos/mascarados, `anonymizedAt` preenchido, snapshots em Appointment/Comanda escrubados.
  - `ComandaItem`, `ClientSubscription`, `ClientPackage` permaneceram 100% intactos — financeiro/comissão preservados.
  - `exportClientData` testada contra cliente real da Vortex, retornou os 4 conjuntos de dados corretamente.
- Deploy de produção confirmado "Ready"; login e tela de Clientes testados manualmente em `livobarber.com.br` (conta Vortex) pós-merge, sem regressão.

**Não incluído neste escopo (débito futuro, não bloqueante):** nenhuma UI foi criada — as duas Server Actions existem, mas hoje só são acionáveis via processo manual (suporte via `privacidade@livobarber.com.br`). Expor um botão para o dono da barbearia ou um painel de solicitações de titular fica para um ticket futuro, se priorizado.

### LIVO-004 — [CONCLUÍDO 09/07/2026] Guardrail contra Prisma em Edge Runtime (regressão do JWTSessionError)

**Status:** ✅ Resolvido, testado e ativo no pipeline de build.
**Problema que era:** A prevenção do bug que já derrubou o login de toda a base dependia de conhecimento tácito ("nunca usar Prisma em callbacks jwt/session"), sem barreira automatizada.
**Achado durante a execução:** ESLint não está instalado no projeto (`next lint` não funciona — sem `eslint.config.*` nem dependência instalada). A solução original prevista (regra ESLint) foi substituída por script standalone em Node puro.
**O que foi feito:** Criado `scripts/guardrail-prisma-edge.js` — isola o corpo dos callbacks `jwt` e `session` em `src/auth.ts` via parsing de chaves balanceadas e bloqueia (exit 1) se detectar uso de `db.`, `prisma.`, `PrismaClient` ou import de `@prisma/client` dentro desses blocos, sem falso-positivo em `authorize`/`events` (que usam Prisma legitimamente em Node Runtime, fora do Edge). Plugado em `"build"` no `package.json` — protege todo deploy na Vercel automaticamente. Também disponível isolado via `npm run guardrail:prisma-edge`.
**Validação:** Testado em 3 cenários — arquivo real (OK), violação direta injetada no `jwt` (bloqueou, exit 1), violação aninhada em `if` no `session` (bloqueou, exit 1). `npx tsc --noEmit` limpo. `auth.ts` restaurado ao original após os testes.
**Commit:** `da62f0a` — comitado junto com LIVO-008 (Vercel Analytics), pois ambos os tickets modificavam `package.json` de forma entrelaçada; decisão pragmática de commit único, mensagem citando os dois tickets.
**Débito relacionado:** A ausência de ESLint no projeto também afetou LIVO-016 e LIVO-027 (ambos previstos originalmente como "regra de lint") — a mesma decisão de abordagem (script standalone vs. instalar ESLint do zero) foi confirmada e aplicada em ambos.

### LIVO-005 — [CONCLUÍDO 09/07/2026, complementado 10/07/2026] Rate limiting em endpoints públicos (OTP, booking público, referral)

**Status:** ✅ Resolvido, migrado para store distribuído e validado em produção. **Complemento aplicado em 10/07/2026** (ver detalhe abaixo) — fechando débito deixado em aberto na sessão original.
**Decisão arquitetural:** ADR-003 (redigido, ver débito de processo registrado em LIVO-037 — ainda não commitado como arquivo físico no repositório).

**Diagnóstico inicial:** rate limiting já existia em 6 pontos do código, mas implementado via `Map<string, {count, resetAt}>` em memória de módulo — mecanismo que não sobrevive a múltiplas instâncias serverless da Vercel nem a cold starts, ou seja, aparentava funcionar mas não cumpria a função de segurança sob carga real de produção. Diagnóstico também revelou 3 endpoints públicos sem nenhum rate limit: `reset-password` (consumo de token, superfície de força bruta), `register` (criação de conta) e `vip` (lead capture → tabela protegida `WaitlistLead`).

**O que foi feito:**

1. Migração completa para **Upstash Redis** (`@upstash/ratelimit` + `@upstash/redis`, plano Free, região `sa-east-1`), via abstração central `src/lib/rate-limit.ts` — client lazy (mesmo padrão de `src/lib/posthog.ts`), `Ratelimit.slidingWindow`, fail-open com log via `@/lib/logger` em qualquer falha (tanto na construção do client quanto na chamada de rede).
2. Fechados os 3 gaps reais: `reset-password` (5/10min, por IP — confirmado antes que o token é uso único via `consumePasswordResetToken`, invalidado atomicamente em `$transaction`), `register` (5/60min, por IP), `vip` (3/60min, por IP).
3. Migrados os 6 pontos já existentes para a mesma abstração, preservando limites/janelas originais: `auth.ts` (login, per-email), `forgot-password` (per-email), `[slug]/book` (2 buckets: booking 10/1h + slots 120/1h, per-IP), `otp-clube.ts`/`clube/actions.ts` (per-barbershopId+phone), `api/livia` (per-user), `tv/api/pair` (per-IP).
4. Cuidado especial em `auth.ts`: confirmado antes da migração que o rate limit de login roda só dentro de `authorize()` (Node Runtime), nunca nos callbacks `jwt`/`session` (Edge) — validado também via `npm run guardrail:prisma-edge` pós-migração.

**Incidente durante o rollout (resolvido):** após o deploy, login e `forgot-password` pararam de funcionar (`forgot-password` com erro 500, login mascarado como "credenciais incorretas"). Causa raiz: `UPSTASH_REDIS_REST_URL`/`TOKEN` foram coladas manualmente no Vercel **com aspas literais incluídas no valor** (ex: `""https://...""`), tornando a URL inválida e quebrando a construção do cliente Redis com exceção síncrona não capturada — em `forgot-password` isso escapava do `try/catch` da função (a criação do client acontecia antes dele); em `auth.ts`, a mesma exceção se propagava de dentro de `authorize()` e o NextAuth a absorvia como falha de credencial genérica, mascarando o erro real. Corrigido em duas frentes: (1) valor da env var corrigido no Vercel, sem aspas; (2) blindagem em `getRedis()` — construção do client também envolvida em `try/catch` com fail-open, para que qualquer erro futuro de configuração de env var nunca mais derrube uma rota inteira, apenas desative o rate limit silenciosamente (logado).

**Validação em produção:** login normal confirmado (conta Vortex), `forgot-password` sem erro 500, painel Upstash confirmando 14 comandos registrados (6 writes / 8 reads) — Redis sendo alcançado de verdade, não em fail-open silencioso.

**Custo:** Upstash Free Tier, $0,00 (500k comandos/mês incluídos, uso atual é uma fração mínima).

**Complemento (10/07/2026):** a blindagem `try/catch` fail-open em `getRedis()` descrita acima havia sido escrita durante a sessão original do LIVO-005, mas **ficou pendente no working tree, nunca commitada** — descoberta como débito solto no início desta sessão (10/07/2026). Diagnosticada (`git diff`), confirmada como fiel ao que já estava documentado neste ticket, e formalmente commitada: branch `fix/livo-005-redis-failopen-guard`, commit `fdf9d85`, merge `--no-ff` em `main` (`35fd08a`), `npx tsc --noEmit` limpo, validado em preview e em produção (deploy "Ready", login Vortex confirmado). Ou seja: a proteção só passou a existir de fato em produção a partir de 10/07/2026 — antes disso, apesar de documentada, não estava deployada.

**Débito de processo registrado:**

- Push direto em `main`, sem branch de feature/preview isolado — terceira ocorrência do mesmo padrão já visto em LIVO-008 e LIVO-013. Desta vez o impacto atingiu login em produção (ver incidente acima). **Resolvido a partir do LIVO-003**, que já adotou branch de feature.
- Ver LIVO-037 para o débito de ADRs não commitados (002 e 003).
- **Aprendizado geral de processo:** ao colar valores de variáveis de ambiente manualmente na interface do Vercel, sempre colar sem aspas ao redor do valor — aspas em `.env.local` são delimitador de sintaxe (interpretadas pelo Next.js), mas no campo do Vercel viram parte literal do valor armazenado.
- **Débito pendente identificado durante o LIVO-003, agora fechado (10/07/2026):** ~~`src/lib/rate-limit.ts` tem alterações no working tree que não foram commitadas~~ — resolvido, ver "Complemento" acima.

---

## 3. PERFORMANCE

### LIVO-006 — Auditoria de índices para queries escopadas por `barbershopId`

**Objetivo:** Garantir performance em escala de milhares de barbearias.
**Problema atual:** Não há confirmação de que todas as tabelas de alto volume (agenda, comandas, movimentações de estoque) têm índice composto começando por `barbershopId`.
**Impacto no negócio:** Degradação de performance conforme a base cresce (Horizonte 2/3 do Operating System).
**Prioridade:** Alta
**Complexidade:** Média
**Dependências:** Acesso ao schema Prisma atual.
**Critérios de aceite:** Todas as queries de listagem (agenda, comandas, movimentações) usam índice; `EXPLAIN ANALYZE` no Neon confirma uso de índice, não sequential scan.
**Passos técnicos:**

1. Diagnóstico: `prisma schema` + queries mais frequentes.
2. Rodar `EXPLAIN ANALYZE` no Neon SQL Editor nas queries críticas.
3. Adicionar índices compostos faltantes via migration aditiva.
4. Validar `migrate diff` sem DROP.

### LIVO-007 — Auditoria de N+1 queries no fluxo de comanda/PDV com rateio de comissão

**Objetivo:** Evitar lentidão no fechamento de comanda em horário de pico.
**Problema atual:** O cálculo de rateio ponderado por combo/serviço pode gerar múltiplas queries por item se não usar `include`/`select` otimizado.
**Impacto no negócio:** Fechamento de comanda lento prejudica experiência no balcão (momento crítico de pagamento).
**Prioridade:** Média
**Complexidade:** Média
**Dependências:** LIVO-006
**Critérios de aceite:** Fechamento de comanda com múltiplos itens/combos gera no máximo 1-2 roundtrips ao banco além da transação de escrita.
**Passos técnicos:**

1. Diagnóstico: revisar código de fechamento de comanda com foco em loops que chamam Prisma.
2. Reescrever com `include`/agregação em query única onde possível.
3. Medir antes/depois via log de tempo de resposta em produção (Vercel).

### LIVO-008 — [CONCLUÍDO 09/07/2026] Ativação do Vercel Analytics

**Status:** ✅ Resolvido e validado em produção.
**O que foi feito:** Web Analytics ativado no painel Vercel (plano Hobby, 50.000 eventos/mês incluídos). Pacote `@vercel/analytics` instalado via npm. Componente `<Analytics />` adicionado em `src/app/layout.tsx`, como irmão de `<ToastProvider>` dentro de `<body>` — cobre automaticamente todas as rotas via layout raiz (auth, dashboard, legal, onboarding, tv, institucional), sem necessidade de duplicar em cada grupo de rotas.
**Commit:** `da62f0a` — comitado junto com LIVO-004 (guardrail Prisma/Edge), já que ambos modificavam `package.json`/`package-lock.json` de forma entrelaçada.
**Validação:** `npx tsc --noEmit` limpo. Confirmado em produção: dashboard Vercel Analytics mostrando 1 visitante, 7 page views, rotas capturadas corretamente (`/`, `/dashboard`, `/planos`, `/produto`), coleta em tempo real ("1 online").
**Nota:** Push feito diretamente em `main` (produção) — não passou por preview deployment isolado, pois não havia branch separada configurada para este ciclo. Validação ocorreu direto em produção, com resultado confirmado antes de considerar o ticket fechado.

---

## 4. UX/UI

### LIVO-009 — Redesenho do onboarding self-service (cadastro em etapa única + trial automático)

**Status:** 🔄 **Parcialmente concluído e validado em produção (10/07/2026).** Duas fatias já entregues, mais um conjunto de itens derivados já resolvidos nesta sessão:

- ✅ **Fatia 1 — Cadastro em tela única:** commit `27206cb` (branch `feature/livo-009-onboarding-tela-unica`), merge `175641f`. Validado em produção: nova rota `/cadastro` com 6 campos (nome, e-mail, senha, confirmação, nome da barbearia, termos), trial PRO automático, redirect para `/dashboard`. Confirmado via Neon que `cpf`/`birthDate`/`cep`/`street`/`neighborhood` ficam `null` na criação, como projetado.
- ✅ **Fatia 2 — Checklist de ativação (5 passos):** commit `777054b` (branch `feature/livo-009-checklist-ativacao`), merge `9168ec5`. `onboarding-checklist.tsx` estendido de 3 para 5 passos (completar cadastro, confirmar plano, adicionar profissional, criar serviços, primeiro agendamento). Campos de endereço (CEP com autopreenchimento ViaCEP, rua, bairro, cidade) adicionados a "Informações da Barbearia" (`basic-info-form.tsx`). Confirmado durante a implementação que CPF/data de nascimento já existiam em "Dados Pessoais" (`personal-info-form.tsx`/`updatePersonalInfo`, com checagem de unicidade e escopo por sessão via `getCurrentMembership`) — não foram duplicados. Validado em produção com conta de teste real: checklist progride corretamente de 2/5 para 3/5 conforme itens são concluídos.
- ✅ **LIVO-040 resolvido (10/07/2026):** os 6 CTAs institucionais que ainda apontavam para `/onboarding` agora apontam para `/cadastro` (ver ticket próprio acima).
- ✅ **LIVO-041 resolvido (10/07/2026):** checkbox de termos obrigatório implementado em `/cadastro` (e em `/aceitar-termos`), mais correção do bug de loop de sessão órfã (ver ticket próprio acima).

**Ainda pendente dentro deste ticket (próximas fatias):**

- Decidir o destino das rotas antigas `/register` e `/onboarding` (manter como estão, redirecionar para `/cadastro`, ou remover) — inclui decidir o que fazer com o gate interno de "logado sem barbearia" identificado durante o LIVO-040 (hoje ainda aponta para `/onboarding`).
- Aplicar identidade visual nova em `/login` e `/cadastro` (LIVO-042).
- Instrumentação de funil via PostHog (eventos de início/conclusão do cadastro) — ainda não implementada.
- LIVO-046 (try/catch em envio de e-mail no registro) — ainda não resolvido.

**Diagnóstico já concluído (read-only, 10/07/2026):** o fluxo real hoje é dividido em duas rotas: `(auth)/register` (nome/email/senha/termos, cria `User`, auto-login, redireciona para `/onboarding`) e `(onboarding)/onboarding` (wizard de 2 passos: dados pessoais + CPF, depois endereço + escolha de plano Start/Pro, cria `Barbershop`/`Membership`/`Professional` em `$transaction`). Achados relevantes do diagnóstico:

- Campo "telefone fixo" (`_landline`) é capturado no formulário do Step 1 e **descartado silenciosamente** — não existe coluna correspondente no model `Barbershop`. Decisão: remover o campo do formulário (nunca foi usado).
- CTAs "Começar agora" do site institucional apontavam direto para `/onboarding`, não para `/register` — gerava redirect indevido para `/login` quando o visitante não tinha sessão. **Resolvido via LIVO-040.**
- Envio de e-mail de boas-vindas/verificação em `registerUser` não está envolvido em `try/catch` — falha do provedor de e-mail pode derrubar o cadastro depois que o `User` já foi criado no banco (risco identificado, não corrigido neste ticket — ver LIVO-046).

**Decisão de produto (fechada com o founder em 10/07/2026):**

1. **Cadastro inicial vira uma única tela**, substituindo as duas rotas atuais: nome, e-mail, senha, nome da barbearia (+ opção "Entrar com Google"). CPF, data de nascimento, celular e endereço completo **saem do fluxo inicial**.
2. Ao submeter, cria-se `User` + `Barbershop` + `Membership` (owner) + `Professional` em uma única ação transacional — igual ao padrão já usado em `createBarbershop`, mas com bem menos campos obrigatórios de entrada.
3. **Plano padrão: trial automático no plano PRO**, contando desde a criação da conta (reaproveita o mecanismo de trial já existente — mesmo tratamento dado hoje a leads de waitlist com 60 dias, sem criar um terceiro estado "sem plano definido" no sistema).
4. Usuário é redirecionado **direto para o dashboard** após o cadastro — não passa mais por uma segunda tela de onboarding antes de ver o produto.
5. Dentro do dashboard, o que antes seria um banner simples de "Complete seu cadastro" evolui para um **checklist de ativação** — decisão tomada em 10/07/2026 ao discutir separadamente o tema de tutorial/tour guiado (ver LIVO-047 para o mecanismo complementar de dicas contextuais). Padrão de mercado adotado (Notion, Linear, Stripe Dashboard): checklist de progresso visível (ex: "3 de 5 concluídos"), nunca um tour clássico de passo-a-passo cobrindo a tela inteira — alinhado ao próprio Princípio da Clareza do Decision Framework ("interfaces devem ensinar através do uso"). Itens do checklist:
   - Completar cadastro (CPF, data de nascimento, celular, endereço)
   - Confirmar ou trocar o plano (trial PRO padrão)
   - Cadastrar o primeiro profissional
   - Cadastrar o primeiro serviço
   - Criar o primeiro agendamento
     O checklist não bloqueia o uso do sistema em nenhum momento — é só um guia de progresso visível, dispensável a qualquer momento.
6. Campo de telefone fixo removido do formulário (nunca foi persistido — ver achado acima).
7. Instrumentação de funil via PostHog (mesmo padrão do LIVO-013): eventos `onboarding_iniciado`, `onboarding_concluido`, e idealmente um evento de abandono ou ao menos rastreamento de tempo entre os dois, para gerar dado real de conversão — hoje inexistente. Estender a mesma instrumentação para cada item do checklist de ativação (ex: `ativacao_item_concluido` com o nome do item), permitindo medir no futuro em qual passo os donos mais travam.

**Pendência a resolver durante a implementação:** confirmar se a escolha de plano feita a partir da página `/planos` (clique em "Assinar Start" ou "Assinar Pro") deve ser respeitada no cadastro em vez do trial PRO padrão — diagnóstico desta sessão não concluiu se há propagação de plano hoje (ver LIVO-043).

**Impacto no negócio:** Afeta diretamente ativação (Growth) e CAC efetivo — reduz o número de campos/telas entre "quero começar" e "estou usando o produto".
**Prioridade:** Alta
**Complexidade:** Média/Grande (mexe em criação de conta, criação de barbearia, e introduz um componente novo — banner de checklist — no dashboard)
**Dependências:** Nenhuma bloqueante. Relacionado a LIVO-040 (✅ resolvido), LIVO-041 (✅ resolvido), LIVO-042 (visual de login/register), LIVO-043 (propagação de plano).
**Processo:** Por tocar em criação de conta e billing implícito (definição de plano/trial), segue obrigatoriamente o padrão de branch de feature + preview isolado antes do merge em `main` (mesmo padrão do LIVO-003).
**Critérios de aceite:**

- Cadastro completo em uma única tela, com no máximo 4 campos obrigatórios (nome, e-mail, senha, nome da barbearia). ✅
- Barbearia criada entra automaticamente em trial PRO. ✅
- Usuário cai direto no dashboard após o cadastro, sem tela intermediária de onboarding. ✅
- Checklist de ativação visível e funcional, cobrindo os 5 itens definidos (cadastro completo, plano confirmado, primeiro profissional, primeiro serviço, primeiro agendamento), nunca bloqueando o uso do sistema. ✅
- Todos os CTAs institucionais apontando para o fluxo novo. ✅ (LIVO-040)
- Checkbox de termos obrigatório, sem loop de sessão órfã. ✅ (LIVO-041)
- Eventos de funil e de ativação aparecem no PostHog. ⏳ Pendente.
- `npx tsc --noEmit` limpo; validado em preview antes do merge. ✅ (em todos os commits realizados até aqui)

**Passos técnicos:**

1. Diagnóstico complementar: confirmar propagação (ou ausência) de plano vindo de `/planos` (LIVO-043) antes de fechar a lógica de plano padrão. ✅ Concluído.
2. Unificar `/register` e `/onboarding` em uma única rota/Server Action, reaproveitando validações já existentes (rate limit, duplicidade de e-mail, hash bcrypt, aceite de termos). ✅ Concluído (fatia 1).
3. Ajustar `createBarbershop` (ou equivalente novo) para não exigir CPF/nascimento/endereço na criação inicial. ✅ Concluído.
4. Implementar componente de checklist de ativação no dashboard. ✅ Concluído (fatia 2).
5. Remover campo de telefone fixo do formulário. ✅ Concluído.
6. Instrumentar eventos de funil via `captureEvent`. ⏳ Pendente.
7. Atualizar CTAs "Começar agora" para apontar para a nova rota unificada. ✅ Concluído (LIVO-040).
8. Validar em branch de feature + preview antes do merge. ✅ Padrão seguido em todos os commits.

### LIVO-023 — Polimento de fluxo de onboarding self-service (frontend)

**Status:** Consolidado dentro do escopo do LIVO-009 nesta atualização — não é mais um ticket de frontend separado, já que a decisão de unificar o fluxo em uma tela torna a divisão backend/frontend menos relevante para este ciclo específico. Mantido como referência histórica.
**Prioridade:** Alta | **Complexidade:** Média | **Dependências:** LIVO-009

### LIVO-042 — Débito visual: /login e /register fora do redesign institucional + baixa proeminência do CTA "Criar conta"

**Status:** 🆕 Identificado em 10/07/2026, a partir de print enviado pelo founder mostrando a tela de `/login` em produção. Ainda não executado.
**Problema atual:** O LIVO-032-A (redesign do site institucional) teve escopo explicitamente limitado a `/`, `/produto` e `/planos` — as rotas `/login` e `/register` nunca passaram pelo redesenho completo (Poppins nos headlines, wordmark oficial "L I V O" com espaçamento correto, paleta e componentes atualizados). O vermelho visível nessas telas hoje vem apenas do variant `red` do `Button` compartilhado (LIVO-035), não de um desenho intencional da tela inteira. Adicionalmente, o link "Criar conta" na tela de login está abaixo do botão principal "Entrar", em texto pequeno — baixa hierarquia visual para uma ação tão importante (é o caminho de entrada de todo cliente novo).
**Impacto no negócio:** Inconsistência de marca logo na porta de entrada mais crítica do produto (login/cadastro); possível perda de conversão por quem não percebe a opção de criar conta.
**Prioridade:** Média/Alta (sobe de prioridade por afetar diretamente a entrada de novos clientes, tema central desta rodada)
**Complexidade:** Pequena/Média
**Dependências:** Deve ser executado em conjunto com o LIVO-009, já que o formulário de cadastro em si já foi redesenhado (nova tela `/cadastro`) — faz sentido aplicar a identidade visual nova diretamente na tela nova, em vez de estilizar a tela antiga e depois trocá-la.
**Critérios de aceite:** `/login` e `/cadastro` seguem a mesma identidade visual do site institucional (tipografia, wordmark, paleta, componentes). Botão "Criar conta" tem proeminência visual equivalente (ou próxima) ao botão "Entrar com Google"/"Entrar", facilmente identificável sem precisar procurar.
**Passos técnicos:**

1. Aplicar Poppins/wordmark/paleta oficial em `/login` (fonte, espaçamento, cores, ícones lucide onde aplicável).
2. Elevar "Criar conta" a botão (não link de texto), posicionado logo abaixo de "Entrar com Google", antes do formulário de e-mail/senha.
3. Aplicar a mesma identidade visual em `/cadastro` (parcialmente já no padrão visual do produto, mas vale conferir consistência total com `/`, `/produto`, `/planos`).
4. Validar responsividade mobile/tablet, mesmo critério já usado no LIVO-032-A.

### LIVO-043 — [RESOLVIDO POR DECISÃO ARQUITETURAL 10/07/2026] Confirmar propagação da escolha de plano em /planos → cadastro

**Status:** ✅ Diagnóstico concluído em 10/07/2026 — confirmado que `/onboarding` não lê `searchParams` nem qualquer `plan=` da URL; o wizard atual inicia sempre com `useState<"start"|"pro">("start")`, ignorando qual card foi clicado em `/planos`. **Não será corrigido no fluxo antigo.** A lacuna se torna irrelevante com a arquitetura decidida para o LIVO-009: a escolha de plano deixa de acontecer no momento do cadastro (trial PRO automático para todos, plano confirmado depois via checklist de ativação) — logo, propagar `plan=` para um wizard que está sendo substituído seria esforço descartável.
**Nota:** se no futuro o cadastro voltar a oferecer escolha de plano no primeiro passo (ex: por decisão de negócio revertida), esta lacuna deve ser reavaliada nesse momento.

---

## 5. INFRAESTRUTURA

### LIVO-012 — Integração WhatsApp via Z-API

**Objetivo:** Expandir alertas via WhatsApp usando Z-API como camada de envio.
**Problema atual:** Alertas WhatsApp existem, mas integração via Z-API ainda não implementada.
**Impacto no negócio:** Canal de comunicação crítico para lembretes de agendamento e marketing (clientes inativos, aniversariantes).
**Prioridade:** Alta
**Complexidade:** Média
**Dependências:** Conta/credenciais Z-API.
**Critérios de aceite:** Mensagens de alerta (confirmação de agendamento, lembrete, marketing) são enviadas via Z-API com log de sucesso/falha por `barbershopId`.
**Passos técnicos:**

1. Diagnóstico: mapear pontos atuais de envio de WhatsApp no código.
2. Criar camada de abstração de "provedor de mensagem" para permitir troca futura de provedor.
3. Integrar Z-API respeitando idempotência (evitar reenvio duplicado).
4. Testar em conta Vortex antes de produção.
   **Nota (10/07/2026):** avaliado como possível diferencial do plano Prime durante discussão de reposicionamento (ver LIVO-044) — decisão de posicionamento adiada até a integração existir de fato; não travar como "exclusiva de plano" antes de estar construída.

### LIVO-013 — [CONCLUÍDO 09/07/2026] Setup de PostHog com eventos tenant-level

**Status:** ✅ Resolvido e validado em produção (evento `agendamento_criado` confirmado no dashboard PostHog, via conta Vortex).
**O que foi feito:** Criado wrapper server-side lazy `src/lib/posthog.ts` (client `posthog-node` instanciado sob demanda, nunca em `instrumentation.ts`, para não rodar em contexto compartilhado com Edge). Adicionadas `POSTHOG_API_KEY`/`POSTHOG_HOST` em `SERVER_ENV_VARS` (`src/lib/env.ts`), ambas `critical: false`. `captureEvent(distinctId, event, barbershopId, properties?)` exige `barbershopId` como parâmetro posicional obrigatório (não apenas mais uma property opcional) e sempre o injeta nas properties enviadas — impossível de esquecer por design de tipo, mesmo princípio dos guardrails já existentes no projeto.
**6 eventos instrumentados, 8 pontos de código cobertos** (`distinctId = barbershopId` em todos; `try/catch` silencioso ao redor de cada `captureEvent`, logado via `@/lib/logger`, nunca relançado — analytics nunca quebra a Server Action; disparo sempre depois do commit de qualquer `$transaction`, nunca dentro dela):

1. `agendamento_criado` — `createAppointmentCore` (`src/lib/appointment-core.ts`).
2. `agendamento_cancelado` — 3 caminhos: `updateAppointmentStatusCore` (`source: "cancelamento_manual"`), `cancelarComanda` em `comandas/actions.ts` (`source: "cancelamento_via_comanda"`), `markWhatsappSent(..., "noshow")` em `agenda-actions.ts` (`source: "marcado_como_noshow"`).
3. `comanda_fechada` — `fecharComanda` (`comandas/actions.ts`), com `totalInCents`, sem dado pessoal do cliente.
4. `cliente_criado` — 3 caminhos: `createClient` em `clients/actions.ts` (`source: "crm_manual"`), criação automática por telefone novo em `createAppointmentCore`/`updateAppointmentCore` (`source: "agendamento_automatico"`), `verifyClientCode` em `clube/actions.ts` (`source: "clube_publico"`).
5. `assinatura_cancelada` — webhook Asaas (`webhooks/asaas/route.ts`), blocos `PAYMENT_DELETED` e `SUBSCRIPTION_DELETED`, com `planStatus: { not: lifetime }` repetido como defesa em profundidade na query que resolve o `barbershopId` antes do evento (redundante com o guard já existente, mas intencional sobre a TX Barbearia).
6. `profissional_adicionado` — 2 caminhos: `createProfessional` em `profissionais/actions.ts` (`source: "perfil_sem_login"`), `acceptInvitationAction` em `convite/[token]/actions.ts` (`source: "convite_aceito"`, disparado só quando a `Membership` é de fato criada — não em `createInvitationAction`, que é apenas o envio do convite).

**Commit:** `fcbb6fa` — 12 arquivos (296 inserções, 2 remoções), incluindo `posthog-node` como nova dependência (`package.json`/`package-lock.json`); sem incluir `LIVO_BACKLOG.md`.
**Validação:** `npx tsc --noEmit` limpo em todas as etapas (0 erros, 0 diagnostics). Confirmado em produção: evento `agendamento_criado` recebido no dashboard PostHog (conta Vortex), library `posthog-node`, `distinct_id` = `barbershopId` correto.
**Nota de processo (débito registrado):** Push feito diretamente em `main`, sem branch de feature/preview isolado — repete o mesmo padrão do LIVO-008. **Resolvido a partir do LIVO-003.**
**Nota (10/07/2026):** o LIVO-009 vai adicionar novos eventos de funil de onboarding a esta mesma infraestrutura — nenhuma mudança na abstração central é necessária, apenas novos pontos de chamada.

### LIVO-030 — Migração de conta Asaas para CNPJ da empresa (subconta Clube de Assinatura)

**Status:** ⏸️ **Pausado por decisão do founder (09/07/2026).** Todo o bloco Asaas (LIVO-030 + LIVO-002) fica agrupado para execução em uma única etapa, somente quando a conta PJ estiver com documentos 100% aprovados. Diagnóstico read-only já foi concluído em 08/07/2026 (achados abaixo permanecem válidos), mas a execução — incluindo qualquer novo diagnóstico adicional — não deve ser retomada isoladamente antes da aprovação.
**Achados do diagnóstico (08/07/2026, ainda válidos):**

- `ASAAS_KEY` é única e compartilhada entre billing principal e Clube — trocar esse único valor cobre os dois fluxos.
- Query no Neon confirmou **zero** registros com `clubAsaasWalletId` preenchido e **zero** com `asaasCustomerId` preenchido — nenhum dado real de cliente/assinatura em produção hoje. **Não há migração de dados a fazer, só troca de credencial.**
- `ASAAS_CLUBE_WEBHOOK_TOKEN` não vem da Asaas — é gerado pela LIVO e informado à Asaas via `configureClubWebhook`. Já resolvido em LIVO-033.
  **Próximo passo real (só quando a Asaas aprovar E o bloco for retomado):** gerar nova `ASAAS_KEY` no painel da conta PJ, atualizar no Vercel, redeploy, testar assinatura fictícia na conta Vortex.

**Objetivo:** Trocar as chaves de API do Asaas no Vercel e vincular a nova conta PJ assim que aprovada, sem quebrar assinantes já vinculados à integração anterior.
**Problema atual:** A subconta anterior não foi aprovada por exigir conta PJ. Uma nova conta Asaas foi aberta com o CNPJ da SALA Tecnologia e está aguardando aprovação de documentos.
**Impacto no negócio:** Bloqueia a consolidação em produção do Clube de Assinatura (feature já implementada em 7 fases); risco de retrabalho se houver dado vinculado à integração antiga.
**Prioridade:** Crítica (quando retomado) — **Pausado** por decisão do founder até a Asaas aprovar os documentos.
**Complexidade:** Pequena/Média
**Dependências:** Aprovação externa da Asaas. Relacionado a LIVO-002 (validação de webhook deve ser retestada com a nova conta) — os dois formam o bloco Asaas único.
**Critérios de aceite:** Variáveis de ambiente da Asaas atualizadas no Vercel (Production); nenhuma assinatura ativa quebra; webhook segue validando corretamente com a nova conta; teste de assinatura fictícia (conta Vortex) bem-sucedido.
**Passos técnicos (retomar somente quando o bloco for liberado):**

1. Verificar se existe algum `asaasSubaccountId` ou similar já persistido no banco vinculado à conta antiga/reprovada, que precisará ser migrado ou invalidado.
2. Assim que a conta nova for aprovada: atualizar as variáveis no Vercel (Production, e Preview se aplicável).
3. Reexecutar teste de webhook com a nova conta (ver LIVO-002).
4. Validar em produção com uma assinatura de teste na conta Vortex antes de liberar para clientes reais.

### LIVO-014 — Roteamento de domínio multi-marca (livobeauty.com.br)

**Objetivo:** Preparar infraestrutura para o lançamento da vertical Beauty sob o mesmo deployment.
**Problema atual:** Arquitetura decidida (single codebase/DB, middleware detecta marca), mas roteamento de domínio ainda não implementado.
**Impacto no negócio:** Bloqueador direto para Fase 2 do roadmap (LIVO BEAUTY).
**Prioridade:** Média (vira Alta quando o lançamento de Beauty for confirmado)
**Complexidade:** Média
**Dependências:** LIVO-018 (VerticalType no schema)
**Critérios de aceite:** Acessar `livobeauty.com.br` resolve a mesma aplicação com `data-brand` correto, sem afetar tráfego de `livobarber.com.br`.
**Passos técnicos:**

1. Configurar domínio adicional no Vercel apontando para o mesmo projeto.
2. Implementar middleware de detecção de host → `data-brand`.
3. Testar isoladamente em preview deployment antes de produção.
   **Nota (10/07/2026):** ver LIVO-048 — antes de implementar lógica nova de detecção de host no middleware, resolver primeiro a duplicidade de arquivos `middleware.ts` (raiz vs. `src/`), para não adicionar lógica nova no arquivo errado (o que hoje é código morto).

---

## 6. BANCO DE DADOS

### LIVO-015 — Adição aditiva do enum `VerticalType`

**Objetivo:** Suportar multi-vertical (Barber → Beauty → Med) sem migração destrutiva.
**Problema atual:** Decisão arquitetural tomada, implementação não iniciada.
**Impacto no negócio:** Base estrutural para Fase 2 do roadmap estratégico.
**Prioridade:** Média
**Complexidade:** Pequena
**Dependências:** Nenhuma
**Critérios de aceite:** `prisma migrate diff` mostra apenas ADD COLUMN/enum, sem DROP; TX Barbearia e demais registros existentes não são afetados (default seguro para `barber`).
**Passos técnicos:**

1. Adicionar enum `VerticalType` e campo em `Barbershop` com default `barber`.
2. Rodar `prisma migrate diff` — hard stop se houver DROP.
3. Aplicar `migrate dev` local, validar, depois produção.
4. Confirmar via Neon SQL Editor que TX Barbearia permanece `lifetime`/inalterada.

### LIVO-016 — [CONCLUÍDO 09/07/2026] Formalização de CI check para `prisma migrate diff`

**Status:** ✅ Resolvido, testado e ativo no pipeline de build.
**Problema que era:** Regra "hard stop em qualquer DROP" seguida apenas por disciplina manual, sem enforcement automatizado.
**Achado durante a execução:** Sem `.github/workflows` configurado — deploy é via integração direta Vercel↔Git. O único gate automatizado real é o script `"build"` do `package.json`. Diagnóstico também revelou 4 migrations antigas (maio/junho 2026) com DROP legítimo já aplicado em produção (refatorações: rename de campos em `barbershops`, migração de tabelas para nomenclatura capitalizada, comissão movida de `memberships` para `Professional`) — a regra não pode ser retroativa, ou o build quebraria permanentemente.
**O que foi feito:** Criado `scripts/guardrail-migrate-diff.js` — script standalone (só `fs`/`path`, mesmo padrão do `guardrail-prisma-edge.js`), sem dependência de banco de dados. Funcionamento:

- Baseline versionado (`scripts/.migrate-guard-baseline.json`) marca a última migration já aprovada — na primeira execução, foi inicializado com `20260704232108_add_embaixador_referral_fields`, aposentando as 4 migrations antigas com DROP sem exigir ação manual.
- Só migrations **mais novas** que o baseline são escaneadas por `DROP TABLE|COLUMN|CONSTRAINT|INDEX`.
- Allowlist versionada (`scripts/.migrate-guard-allowlist.json`, array vazio por padrão) permite exceção explícita e auditável por nome de migration — decisão tomada em vez de env var, para evitar uma flag global que pode ficar ligada silenciosamente e virar um guardrail decorativo. Qualquer exceção fica visível no Git/code review.
- Migration nova com DROP fora da allowlist → `exit 1`, build falha, com mensagem indicando nome da migration, statement encontrado e instrução de como aprovar.
- Ao final de uma execução limpa, o baseline avança automaticamente.
  **Plugado em:** `"build"` do `package.json`, **antes** do `guardrail-prisma-edge.js`. Também disponível isolado via `npm run guardrail:migrate-diff`.
  **Validação:** 6 cenários testados — (1) primeira execução sem baseline: criou baseline, passou, sem escanear DROPs antigos; (2) segunda execução sem migrations novas: passou, nada re-escaneado; (3) migration fake com DROP TABLE: falhou corretamente (exit 1) com mensagem clara; (4) fake adicionada à allowlist: passou com aviso de exceção aprovada; (5) fake removida, allowlist e baseline revertidos ao estado limpo, confirmado sem lixo de teste; (6) `npx tsc --noEmit` limpo (0 erros).
  **Commit:** `f35fbb8` — escopo isolado (`package.json`, `scripts/guardrail-migrate-diff.js`, `scripts/.migrate-guard-baseline.json`, `scripts/.migrate-guard-allowlist.json`), sem incluir `LIVO_BACKLOG.md` (que estava modificado no working tree por edição manual, não relacionada a este ticket).

### LIVO-017 — Extensões de schema para inventário (Grupo D)

**Objetivo:** Cobrir gaps de produto no módulo de estoque.
**Problema atual:** Item genérico listado no Grupo D, sem escopo técnico detalhado ainda.
**Impacto no negócio:** Afeta precisão de controle de estoque para barbearias com produtos físicos.
**Prioridade:** Média
**Complexidade:** A definir
**Dependências:** Levantamento de requisito específico com Edu.
**Critérios de aceite:** A definir após levantamento.
**Passos técnicos:**

1. Levantar com Edu quais gaps específicos de inventário (ex: estoque mínimo, alertas, múltiplos depósitos).
2. Desenhar schema aditivo.
3. Implementar seguindo padrão de movimentação atômica já existente.

---

## 7. BACKEND

### LIVO-018 — Memória da Lívia AI (Grupo D)

**Objetivo:** Permitir que a Lívia mantenha contexto entre interações, alinhado ao "Sistema de IA" do Operating System ("toda funcionalidade deve produzir contexto para a Lívia").
**Problema atual:** Lívia hoje não possui camada de memória persistente.
**Impacto no negócio:** Limita o valor percebido da IA como diferencial competitivo.
**Prioridade:** Alta
**Complexidade:** Grande
**Dependências:** LIVO-013 (eventos/dados estruturados ajudam a alimentar memória)
**Critérios de aceite:** Lívia referencia contexto de interações anteriores do mesmo `barbershopId` em respostas subsequentes, sem vazar contexto entre tenants.
**Passos técnicos:**

1. Definir estratégia de memória (ex: resumo periódico por tenant armazenado no Postgres, não apenas em runtime).
2. Modelar schema de armazenamento de contexto, escopado por `barbershopId`.
3. Integrar recuperação de contexto nas chamadas ao Anthropic API (Lívia).
4. Testar isolamento multi-tenant rigorosamente.

### LIVO-019 — Implementação de cálculo de comissão (líquido vs. bruto) — pendente decisão de negócio

**Objetivo:** Resolver ambiguidade de cálculo de comissão sobre valor líquido (pós-desconto) ou bruto (pré-desconto).
**Problema atual:** Decisão de negócio explicitamente adiada; implementação atual provavelmente assume um dos dois sem flag.
**Impacto no negócio:** Impacta diretamente o repasse financeiro aos profissionais — erro aqui gera disputa financeira real.
**Prioridade:** Crítica (quando decisão de negócio for tomada) — hoje Bloqueada
**Complexidade:** Média
**Dependências:** Decisão de Edu/sócio sobre a regra de negócio.
**Critérios de aceite:** Comportamento configurável ou definido explicitamente, documentado em ADR, com teste cobrindo ambos os cenários caso vire configuração por barbearia.
**Passos técnicos:**

1. Aguardar decisão de negócio (bloqueador).
2. Documentar decisão como ADR seguindo o padrão já usado para multi-vertical.
3. Implementar/ajustar cálculo de rateio conforme decisão.
4. Cobrir com teste automatizado (Vitest) validando `sum(totalInCents) == priceInCents` em ambos os cenários.

### LIVO-020 — Backend de exportação de relatórios (CSV)

**Objetivo:** Suportar LIVO-010 (UX de exportação).
**Problema atual:** Não existe endpoint de geração de arquivo de relatório.
**Impacto no negócio:** Ver LIVO-010.
**Prioridade:** Média
**Complexidade:** Média
**Dependências:** Nenhuma
**Critérios de aceite:** Endpoint gera CSV válido, escopado por `barbershopId`, para relatório financeiro e de comissão.
**Passos técnicos:**

1. Definir formato/colunas do CSV com Edu.
2. Implementar Server Action retornando arquivo (seguindo padrão `return { error }` em caso de falha, nunca `throw`).
3. Validar com conta Vortex em produção.
   **Nota (10/07/2026):** discutido durante reposicionamento do plano Prime — decisão do founder foi que exportação para Excel deve ser **universal, sem trava de plano** (não uma exclusividade do Prime). Manter esse critério ao implementar.

---

## 8. FRONTEND

### LIVO-021 — Resolução de marca via atributo `data-brand`

**Objetivo:** Suportar troca visual entre Barber/Beauty no mesmo código.
**Problema atual:** Decisão arquitetural tomada, implementação de frontend não iniciada.
**Impacto no negócio:** Bloqueador para lançamento visual da vertical Beauty.
**Prioridade:** Média (sobe para Alta quando Beauty for priorizado)
**Complexidade:** Média
**Dependências:** LIVO-014 (roteamento de domínio)
**Critérios de aceite:** Componentes de tema/cor respondem ao atributo `data-brand` sem duplicar componentes.
**Passos técnicos:**

1. Definir tokens de tema por marca (cores, tipografia) seguindo Design System.
2. Implementar CSS variables condicionadas a `[data-brand="beauty"]`.
3. Testar visualmente em preview com ambas as marcas.

### LIVO-022 — Interface de exportação de relatórios

Ver critérios técnicos em LIVO-010 (mesmo ticket, componente de frontend). Inclui a regra de universalidade (sem trava de plano) registrada no LIVO-020.
**Prioridade:** Média | **Complexidade:** Pequena | **Dependências:** LIVO-020

### LIVO-023 — Polimento de fluxo de onboarding self-service (frontend)

Ver nota em LIVO-009 — consolidado dentro daquele ticket nesta atualização.

---

## 9. FUNCIONALIDADES NOVAS

### LIVO-024 — Lançamento da vertical LIVO BEAUTY

**Objetivo:** Validar reutilização da plataforma para uma segunda vertical (Fase 2 do roadmap estratégico).
**Problema atual:** Arquitetura decidida, nada implementado ainda.
**Impacto no negócio:** Marco estratégico — primeira prova de que o LIVO é multi-vertical de fato, não só em teoria.
**Prioridade:** Alta (estratégica)
**Complexidade:** Grande
**Dependências:** LIVO-015, LIVO-014, LIVO-021
**Critérios de aceite:** Uma barbearia de teste consegue operar como salão de beleza (nomenclatura, marca, fluxo) sem afetar nenhum tenant existente de Barber.
**Passos técnicos:**

1. Consolidar LIVO-015 (schema), LIVO-014 (domínio), LIVO-021 (frontend).
2. Ajustar nomenclatura de produto/serviço para o contexto Beauty onde necessário.
3. Rodar teste piloto com uma conta real ou simulada.
4. Validar em produção (Vercel) antes de anunciar publicamente.

### LIVO-031 — Vitrine pública do Programa Embaixadores no site principal (foto Taxinha/TX Barbearia + CTA WhatsApp)

**Objetivo:** Dar visibilidade pública ao Programa Embaixadores (já implementado no backend com códigos de referral e `freeMonthCredits`), usando a TX Barbearia/Taxinha como prova social.
**Problema atual:** O programa existe tecnicamente, mas não há vitrine no site institucional (`livobarber.com.br`) para conversão de novos embaixadores.
**Status:** ✅ **Concluído e publicado em produção** (09/07/2026), como parte do mesmo esforço do LIVO-032-A.
**O que foi feito:**

- Componente `embaixadores.tsx` criado substituindo a antiga seção `partnership.tsx` (Programa de Parceiros, removida — obsoleta com a chegada dos Embaixadores).
- Título: "TX Barbearia — Embaixador Oficial LIVO Barber."
- Parágrafo: enfatiza o _título_ de Embaixador Oficial como algo que outras barbearias também podem conquistar (não "TX foi o primeiro", que soaria como marco fechado), citando acesso a conteúdos, mentorias e benefícios exclusivos.
- Imagem real (`embaixadores-tx.png`) via `next/image`, substituindo o placeholder inicial.
- CTA "Quero ser Embaixador" com link `wa.me` para o número real (16) 99281-3674, mensagem pré-preenchida montada via `encodeURIComponent`.
- **Atenção mantida:** TX Barbearia continua conta `lifetime` protegida — nenhuma alteração de cadastro/billing foi feita, apenas vitrine de marketing.
  **Validação:** `npx tsc --noEmit` limpo, link do WhatsApp testado.

### LIVO-025 — Exportação de relatórios (feature completa)

Consolidação de LIVO-010 + LIVO-020 + LIVO-022 como entrega de produto. Regra fixada em 10/07/2026: **universal, sem trava de plano.**
**Prioridade:** Média | **Complexidade:** Média

### LIVO-026 — Memória da Lívia AI (feature completa)

Consolidação de LIVO-018 como entrega de produto visível ao usuário (Lívia "lembra" de conversas anteriores).
**Prioridade:** Alta | **Complexidade:** Grande

### LIVO-044 — Reposicionamento estratégico do plano Prime (multiusuário com papéis) + ADR pendente

**Status:** 🆕 Decisão estratégica tomada em 10/07/2026, implementação ainda não iniciada.
**Objetivo:** Resolver a perda de diferenciação entre os planos Pro e Prime — o Prime (R$369,90, hoje vendido como versão "extremamente completa") foi perdendo identidade própria conforme funcionalidades pedidas para o Pro (via feedback do Taxinha/TX Barbearia) foram se aproximando do que o Prime deveria oferecer.
**Problema atual:** Não existe hoje um eixo claro de diferenciação do Prime além de "mais funcionalidades" — o que não escala bem, porque toda vez que o Pro cresce, o Prime precisa ganhar itens novos para continuar parecendo superior, disputa que não tem fim natural.
**Decisão tomada (10/07/2026):**

1. **Rejeitada:** cobrança por funcionalidade individual (à la carte/add-ons unitários). Motivo: aumentaria significativamente a complexidade de billing (feature flags por barbearia, lógica de cobrança por módulo) num momento em que a integração de billing (Asaas) sequer está com conta PJ aprovada (LIVO-030, pausado) — não é o momento de tornar o billing mais complexo, e sim mais estável.
2. **Excel (exportação de relatórios) e PWA/disponibilidade nas lojas (App Store/Play Store) saem do escopo exclusivo do Prime e passam a ser universais**, disponíveis independentemente do plano (inclusive Start). Racional: não custam mais caro por cliente rodando, e ajudam retenção da base inteira — travá-los no topo da régua contraria o princípio de retenção do Operating System sem ganho real de upsell.
3. **Z-API (WhatsApp) fica de fora da definição do Prime por enquanto** — a integração ainda não existe (LIVO-012 não iniciado). Posicionamento de plano só deve ser decidido quando a feature estiver construída, não antes.
4. **Prime passa a ser definido por um único eixo: multiusuário com papéis/permissões separadas** (incluindo um papel específico de "contador", com acesso restrito a dados financeiros, sem acesso a agenda/comanda operacional). Esse é o único item da lista original que muda o _tipo_ de cliente atendido (operação com equipe/sócios/contador externo), não apenas a quantidade de recursos disponíveis — e é o tipo de cliente que tolera pagar mais, porque o ganho é organizacional.
5. Preço (R$369,90) pode ser mantido se já tem ancoragem de mercado — o que muda é o discurso de venda: de "tudo incluído" para "para operações com equipe".

**Impacto no negócio:** Resolve um problema estrutural de posicionamento de produto que estava gerando indecisão recorrente sobre o que incluir em cada plano; cria uma feature nova de produto (multiusuário com papéis) como pilar real do plano mais caro.
**Prioridade:** Alta (estratégica) — mas depende de definição de escopo técnico do multiusuário com papéis antes de qualquer implementação.
**Complexidade:** Grande (feature de permissões granulares é trabalho arquitetural real, não cosmético)
**Dependências:** Nenhuma bloqueante técnica; decisão de negócio já tomada, falta desenho técnico do sistema de papéis/permissões.
**Critérios de aceite:** ADR formal documentando a decisão de reposicionamento (nos moldes do LIVO-019/ADR-002/ADR-003); página `/planos` atualizada refletindo o novo discurso do Prime; especificação técnica do sistema de papéis (ex: papel "contador") definida antes de codar.
**Passos técnicos:**

1. Redigir ADR formal da decisão de reposicionamento do Prime (sai Excel/PWA do exclusivo, entra multiusuário com papéis como eixo central) — seguir o mesmo padrão de commit físico já corrigido no LIVO-037 (não deixar só em texto de chat).
2. Especificar o sistema de papéis/permissões: quais papéis existem (owner, profissional, recepção, e o novo "contador"), o que cada um pode ver/fazer, e como isso se relaciona com o model `Membership` já existente.
3. Atualizar copy e estrutura de `/planos` e `plans.tsx` para refletir o novo discurso do Prime.
4. Implementar Excel/PWA como universais (ver LIVO-025), sem trava de plano.
5. Implementar o sistema de papéis como feature própria (provavelmente grande o suficiente para ser seu próprio ciclo de execução, não uma tarefa dentro deste ticket).

### LIVO-045 — Canal obrigatório de sugestão de melhorias (todos os perfis, todos os planos)

**Status:** 🆕 Definido em 10/07/2026 como requisito obrigatório do produto, independente de plano.
**Objetivo:** Criar um canal direto para que usuários reais (owner, profissional, recepção) enviem sugestões de melhoria, reclamações ou pontos de dor — transformando feedback de uso real em sinal de priorização de roadmap (alinhado ao princípio "toda funcionalidade deve produzir contexto para a Lívia"/"todo dado deve gerar inteligência" do Operating System).
**Problema atual:** Não existe hoje nenhum canal estruturado dentro do produto para captar esse tipo de feedback — depende de contato informal (WhatsApp, conversa direta) sem nenhum registro agregável.
**Decisão de design (10/07/2026):**

- **Botão flutuante** (não item de menu lateral) — reaproveita o padrão visual já estabelecido pelo balão da Lívia (`livia-bubble.tsx`), evitando duplicar lógica de item de menu que precisaria ser replicada em toda configuração de permissão por cargo. Ícone distinto do balão da Lívia (ex: megafone ou balão de sugestão), para não gerar confusão entre os dois.
- **Obrigatório em todos os perfis** (owner, profissional, recepção) — não deve depender de nenhuma checagem de role/permissão para aparecer.
- **Sem tela de administração por agora** — as sugestões são gravadas no banco (consulta futura via Neon SQL Editor, mesmo padrão já usado em outras verificações de estado) e disparam e-mail para o founder em tempo real. Uma tela de listagem dedicada fica para um ciclo futuro, se o volume justificar.
  **Impacto no negócio:** Cria uma fonte estruturada e agregável de feedback real de uso, ajudando a priorizar o backlog com base em repetição de pedidos reais (ex: "10 pessoas pedindo a mesma coisa vira ponto de atenção").
  **Prioridade:** Alta (requisito considerado obrigatório pelo founder, não opcional)
  **Complexidade:** Média
  **Dependências:** Nenhuma bloqueante.
  **Critérios de aceite:**
- Botão flutuante visível em todas as telas do sistema logado, para todos os perfis, independentemente do plano da barbearia.
- Ao enviar, gera um registro no banco (escopado por `barbershopId` + `membershipId`/autor + papel de quem enviou + conteúdo da mensagem + timestamp) e dispara e-mail para o founder.
- Falha no envio do e-mail não deve travar a experiência do usuário nem perder a sugestão (mesma lógica de `try/catch` silencioso já usada no PostHog/LIVO-013 — grava no banco primeiro, e-mail é best-effort).
- Nenhum dado sensível de cliente final (dados de `Client`) é exposto nesse canal — é sobre a experiência do usuário do sistema (dono/profissional/recepção) com o próprio LIVO.
  **Passos técnicos:**

1. Modelagem de schema aditivo: nova tabela (ex: `ProductSuggestion`), campos: `id`, `barbershopId`, `membershipId` (ou `userId` + `role` capturado no momento do envio), `message`, `createdAt`. `migrate diff` sem DROP.
2. Componente de botão flutuante + modal/formulário simples (campo de texto livre), seguindo Design System (paleta e componentes já existentes).
3. Server Action: grava no banco dentro de `$transaction` se necessário, dispara e-mail via Resend (padrão já usado em outros e-mails do sistema) envolvido em `try/catch` — falha de e-mail apenas loga, nunca bloqueia nem perde o registro já gravado.
4. Garantir que o botão aparece independente de role — testar com os três perfis (owner, profissional, recepção).
5. Validar em preview, depois produção, com envio de teste real (conta Vortex).

---

## 10. DÉBITO TÉCNICO

### LIVO-035 — [CONCLUÍDO 09/07/2026] Variant "red" no Button compartilhado

**Status:** ✅ Resolvido, parte do LIVO-032-A.
**O que foi feito:** Adicionado variant `red` ao `Button` compartilhado (`src/components/ui/button.tsx`), aditivo — nenhum variant existente (`primary`, `gold`, etc.) foi alterado ou removido. Usado nos CTAs do site institucional fora da seção Embaixadores (navbar, hero, how-it-works, plans).
**Nota:** variant `gold` permanece em uso exclusivo do botão "Quero ser Embaixador" — não é código morto, é decisão de manter essa seção com identidade visual própria.

### LIVO-036 — Componente ai-section.tsx órfão (não referenciado)

**Objetivo:** Decidir o destino de um componente de landing que existe no código mas não é renderizado em nenhuma página atualmente.
**Problema atual:** `src/components/landing/ai-section.tsx` (export `AISection`) está no barrel (`index.ts`) e recebeu atualização de paleta/tipografia/ícones durante o LIVO-032-A (por estar na pasta `landing/`, tratado como dentro do escopo), mas não é importado em `page.tsx`, `produto/page.tsx` nem `planos/page.tsx` — não aparece em nenhuma rota real hoje.
**Impacto no negócio:** Baixo — não afeta usuário final, mas é código não utilizado recebendo manutenção (potencial confusão futura sobre se é código morto ou uma seção "quase pronta" aguardando uso).
**Prioridade:** Baixa
**Complexidade:** Pequena
**Dependências:** Nenhuma.
**Critérios de aceite:** Decisão registrada — ou o componente é integrado a alguma página (provavelmente `/produto`, dado o conteúdo sobre IA), ou é removido do barrel export se de fato obsoleto.
**Passos técnicos:**

1. Confirmar com Edu se essa seção foi abandonada intencionalmente ou se ficou pendente de integração.
2. Se for usar: adicionar `<AISection />` à página apropriada.
3. Se for descartar: remover o arquivo e o export do `index.ts`.

### LIVO-033 — [CONCLUÍDO 08/07/2026] Gap de validação em env.ts para variáveis Asaas do Clube

**Status:** ✅ Resolvido e deployado em produção (Vercel "Ready").
**O que foi feito:** Adicionadas `ASAAS_CLUBE_WEBHOOK_TOKEN` (critical: true), `ASAAS_WEBHOOK_EMAIL` (critical: false) e `NEXT_PUBLIC_ASAAS_SANDBOX` (critical: false) em `SERVER_ENV_VARS` (`src/lib/env.ts`). Variável `ASAAS_CLUBE_WEBHOOK_TOKEN` gerada (GUID) e configurada no Vercel (Production e Preview) antes do deploy.
**Achado adicional (não bloqueante, debt de limpeza):** Existe uma variável `ASAAS_API_KEY` configurada no Vercel que não é lida por nenhum código (órfã). `ASAAS_KEY` é a única realmente usada, compartilhada entre billing principal (`asaas.ts`) e Clube (`asaas-clube.ts`, como "chave da conta raiz"). Remover `ASAAS_API_KEY` do Vercel quando conveniente — sem urgência, não afeta nada.

### LIVO-027 — [CONCLUÍDO 09/07/2026] Guardrail automatizado contra emojis em arquivos `.ts`

**Status:** ✅ Resolvido, testado e ativo no pipeline de build.
**Problema que era:** Regra "sem emoji cru em .ts/.tsx" seguida apenas por disciplina manual, sem enforcement automático (bug já causou corrupção `\uFFFD` no Windows).
**Achado durante a execução:** Diagnóstico read-only encontrou 55 ocorrências de caracteres em ranges Unicode de emoji no código — mas nem todas eram risco real. Análise por codepoint revelou que o mecanismo de corrupção afeta especificamente caracteres astrais (`> 0xFFFF`, par substituto) e caracteres com variation selector `U+FE0F` forçando apresentação emoji — não símbolos BMP isolados como `✓ ✕ ✦ ✉ ⚠`, já usados intencionalmente como ícones de UI em ~21 lugares do código sem risco de corrupção. Divisão real: **34 ocorrências de emoji verdadeiro** (candidatas à regra) vs. **21 ícones de UI legítimos** (fora do escopo).
**O que foi feito:**

1. **Limpeza completa das 34 ocorrências legadas** (decisão do founder: fazer o serviço completo, não usar baseline/tolerância como no LIVO-016):
   - 17 substituídas por ícones `lucide-react` (telas de UI: agenda, clientes, relatórios, onboarding, convite, erro global, vip, booking público, perfil público, hero institucional).
   - 9 substituídas por escape Unicode `\u{XXXX}` (texto enviado a cliente final — mensagens de WhatsApp em `marketing-client.tsx`, assuntos/corpo de e-mail em `email.ts`, texto da Lívia em `livia-bubble.tsx` — mantém o emoji real na entrega ao cliente, mas protege o arquivo-fonte da corrupção de encoding).
2. **Guardrail criado:** `scripts/guardrail-emoji.js` (mesmo padrão standalone dos outros dois guardrails, só `fs`/`path`) — varre `src/**/*.ts(x)`, bloqueia (exit 1) qualquer codepoint astral (`> 0xFFFF`), qualquer `U+FE0F`, e qualquer caractere em range de emoji fora de uma allowlist explícita de 5 codepoints (`✓ 0x2713`, `✕ 0x2715`, `✦ 0x2726`, `✉ 0x2709`, `⚠ 0x26A0`).
3. Plugado em `"build"` do `package.json`, encadeado após `guardrail-migrate-diff.js` e `guardrail-prisma-edge.js`. Disponível isolado via `npm run guardrail:emoji`.
   **Validação:** `node scripts/guardrail-emoji.js` isolado → exit 0 (nenhuma violação restante). `npx tsc --noEmit` → 0 erros. Validado visualmente em produção (Vercel) — ícones renderizando corretamente, mensagens de WhatsApp e assuntos de e-mail preservando o emoji original para o cliente final.
   **Commit:** `db0b13e` — 17 arquivos alterados (164 inserções, 45 remoções), escopo isolado, sem incluir `LIVO_BACKLOG.md` (edição manual pendente, não relacionada).
   **Decisões técnicas registradas durante a execução:**
   - `assinar/page.tsx`: `className="text-5xl"` removido do ícone lucide (ícones SVG não respondem a `font-size` do Tailwind) — usado `size={56}` diretamente.
   - `relatorios-client.tsx`: tipo de `linhas` em `TabelaSimples` ampliado de `string[][]` para `(string | ReactNode)[][]` para acomodar `<Award />` condicional no ranking.
   - `hero.tsx`: objeto de ícones do mockup do sidebar mistura string (`"◼"` Dashboard, `"✦"` IA Livo — fora do escopo, mantidos) com componentes lucide; anotado como `{ icon: string | LucideIcon; ... }[]` com renderização condicional.
   - `livia-bubble.tsx`: um emoji estava em texto JSX solto (não string literal) — envolvido em `{"\u{1F44B}"}`, já que escape Unicode só é interpretado dentro de literais de string JS.

### LIVO-028 — Documentação formal de decisões de negócio pendentes (ADR)

**Objetivo:** Não deixar decisões de comissão (líquido/bruto e outros edge cases) apenas na memória de conversas.
**Problema atual:** Duas decisões de negócio estão explicitamente adiadas sem ADR formal. Nesta atualização, uma terceira decisão (reposicionamento do Prime, LIVO-044) também precisa de ADR formal.
**Impacto no negócio:** Risco de retrabalho e inconsistência se a decisão for tomada informalmente depois.
**Prioridade:** Média
**Complexidade:** Pequena
**Dependências:** Decisão de negócio com sócio (bloqueador externo, não técnico).
**Critérios de aceite:** Existe um documento ADR rastreável assim que a decisão for tomada.
**Passos técnicos:**

1. Criar template de ADR (se ainda não existir) seguindo padrão já usado para multi-vertical.
2. Registrar as decisões pendentes como "ADR em aberto" (comissão líquido/bruto e reposicionamento do Prime).
3. Preencher assim que Edu decidir/formalizar.

### LIVO-029 — [CONCLUÍDO 09/07/2026] Consolidação de guardrails de arquitetura em um único documento de Engineering

**Status:** ✅ Resolvido, testado e ativo na hierarquia documental.
**Problema que era:** LIVO_INDEX referenciava `LIVO_ENGINEERING.md` como documento de Nível 7, mas as regras invioláveis reais do projeto (Prisma fora do Edge, `$transaction` como callback, `@@map()` só em tabela, escopo por `barbershopId`, registros protegidos, os 3 guardrails já implementados) viviam apenas em memória de sessão e convenção tácita.
**Achado crítico durante a execução:** já existia um `LIVO_ENGINEERING.md` versionado no repositório (990 linhas), mas era um template genérico/aspiracional — arquitetura em camadas, multi-tenant, testes, LGPD, criptografia, CI/CD, visão de ecossistema Barber/Beauty/Med/Pet/Fit/Services — sem nenhuma referência concreta ao projeto real. Confirmado via busca por termos-chave (`TX Barbearia`, `WaitlistLead`, `barbershopId`, `@@map`, `guardrail`, `Asaas`, `CNPJ`, `Auth.js`, `Edge Runtime`): zero ocorrências no arquivo anterior. A substituição integral foi considerada segura — não havia conteúdo concreto a mesclar, apenas a estrutura de scaffold do `create-next-app`/boilerplate nunca preenchida com as regras reais.
**O que foi feito:** Reescrita completa do documento (990 → 76 linhas), cobrindo: registros protegidos (TX Barbearia, WaitlistLeads), regras de schema/transaction/barbershopId/migrate-diff, regra de Prisma fora do Edge Runtime, regra de encoding/emoji, os 3 guardrails automatizados com mecanismo e ticket/commit de origem, padrões de execução (sequenciamento, Neon SQL Editor vs. Prisma Studio, governança de mudança) e débito técnico conhecido (`ASAAS_API_KEY` órfã, 4 migrations pré-baseline, `ai-section.tsx` órfão).
**Detalhe de execução:** `Set-Content -Encoding UTF8` do PowerShell 5.1 gravou o arquivo com BOM (`EF BB BF`), inconsistente com o restante do repositório (UTF-8 sem BOM) — corrigido antes do commit via `[System.IO.File]::WriteAllText` com `UTF8Encoding($false)`.
**Validação:** `npx tsc --noEmit` limpo (0 erros) após a remoção do BOM.
**Commit:** `b2aef98` — escopo isolado (`LIVO_ENGINEERING.md`, 76 inserções / 920 remoções), sem incluir `LIVO_BACKLOG.md`.

**Nota de atualização (10/07/2026):** `LIVO_ENGINEERING.md` ainda não reflete o padrão de anonimização estabelecido no LIVO-003 (`Client.phone` obrigatório/único exige placeholder em vez de `null`), o novo padrão de branch de feature, o fechamento do fail-open do `getRedis()` (LIVO-005, complementado 10/07/2026), nem a correção do LIVO-041 (`signOut` server-side ao detectar sessão órfã via P2003). Recomenda-se uma atualização pontual do documento na próxima sessão de consolidação — não é urgente, mas evita retrabalho de redescoberta.

### LIVO-037 — ADRs referenciados no backlog nunca commitados como arquivos físicos no repositório

**Objetivo:** Corrigir uma lacuna de processo descoberta durante o LIVO-005: ADRs são criados em sessões de chat (via ferramenta de arquivo do assistente), mas nunca chegam a ser commitados no repositório real.
**Problema atual:** O **ADR-002** (redesign antecipado, LIVO-032) foi escrito integralmente em uma sessão anterior (08/07/2026) e referenciado no backlog como `ADR-002-redesign-antecipado.md`, mas o arquivo foi gerado apenas no ambiente de saída daquela sessão de chat — nunca foi baixado/commitado no repositório real (`C:\Projetos\livo`). Confirmado via `Get-ChildItem -Recurse -Filter "ADR-*.md"`, que não retornou nenhum resultado. O mesmo padrão se repetiu com o **ADR-003** (rate limiting distribuído, LIVO-005), redigido em sessão anterior mas ainda não commitado. Nesta atualização, um possível **ADR-004** (reposicionamento do Prime, LIVO-044) se soma à mesma pendência assim que for redigido.
**Impacto no negócio:** Baixo/médio — as decisões foram tomadas e executadas corretamente, mas não são rastreáveis via Git/code review, contrariando o Princípio de Governança do Decision Framework ("nenhuma regra importante deve existir apenas no código [ou apenas em texto de conversa]").
**Prioridade:** Baixa (não bloqueia nada tecnicamente, mas fácil de resolver)
**Complexidade:** Pequena
**Dependências:** Nenhuma
**Critérios de aceite:** `ADR-002-redesign-antecipado.md`, `ADR-003-rate-limiting-distribuido.md` e, quando redigido, `ADR-004-reposicionamento-plano-prime.md` existem como arquivos versionados no repositório, em local consistente (ex: pasta `docs/` ou raiz, a definir), com o conteúdo já produzido nas sessões correspondentes.
**Passos técnicos:**

1. Definir pasta oficial para ADRs (ex: `docs/adr/` ou raiz do repo) — decisão pequena, mas deve ser consistente daqui pra frente.
2. Recriar os arquivos com o conteúdo já produzido (disponível no histórico de conversas).
3. Commit isolado, mensagem citando os ADRs retroativos.
4. **Processo daqui pra frente:** sempre que um ADR for redigido nesta camada de arquitetura (chat), o commit do arquivo físico deve ser o primeiro passo do brief de execução passado ao Claude Code — não um passo "opcional depois".

### LIVO-038 — Estratégia de uso/revenda de dados agregados de clientes finais para remarketing/parcerias

**Objetivo:** Formalizar (ou descartar) uma linha de negócio futura em que a LIVO usaria ou disponibilizaria — de forma agregada e/ou mediante consentimento — dados de clientes finais coletados via CRM/Clube de múltiplas barbearias, para fins de remarketing próprio da LIVO ou parcerias comerciais.
**Problema atual:** Ideia levantada informalmente durante a execução do LIVO-003 (auditoria LGPD), ainda sem qualquer desenho de produto, arquitetura ou — principalmente — validação jurídica. É uma questão categoricamente diferente de LIVO-003: o LIVO-003 trata do direito do titular de ser esquecido (uso normal, dentro do propósito original do cadastro); o LIVO-038 trataria de usar o dado para uma finalidade **fora** do propósito original de coleta.
**Impacto no negócio:** Potencialmente alto (nova fonte de receita/valor via dados agregados), mas com risco regulatório proporcional — LGPD normalmente exige base legal específica (tipicamente consentimento explícito e finalístico) para qualquer uso de dado pessoal fora do propósito original coletado pelo barbeiro. Uso do barbeiro sobre seus próprios clientes (remarketing local) não está em questão aqui — já é uso legítimo hoje.
**Prioridade:** Baixa/estratégica — não bloqueia nenhum ticket técnico em andamento.
**Complexidade:** Grande (envolve jurídico, produto, arquitetura de consentimento granular, possivelmente novo termo de uso/política de privacidade).
**Dependências:** **Bloqueador externo, não técnico** — aval jurídico formal antes de qualquer exploração de produto ou arquitetura. Nenhuma implementação deve começar sem isso.
**Critérios de aceite:** Existe uma decisão formal (ADR) definindo se a LIVO seguirá ou não essa linha e, se sim, sob qual base legal (ex: consentimento explícito por titular, anonimização/agregação estatística sem dado identificável, ou descartada por ora).
**Passos técnicos:**

1. Consultar jurídico especializado em LGPD sobre a viabilidade e a base legal necessária para qualquer uso agregado/de revenda de dados de titulares coletados por terceiros (barbearias) na plataforma.
2. Só após parecer jurídico: desenhar, se aprovado, um mecanismo de consentimento explícito e granular por titular (distinto do consentimento original dado ao barbeiro).
3. Documentar a decisão (seguir ou não) como ADR, independentemente do resultado.
4. Não implementar nenhum código antes das etapas 1-3.

### LIVO-046 — Envio de e-mail em `registerUser` sem `try/catch` (risco identificado, não corrigido)

**Status:** 🆕 Identificado em 10/07/2026 durante diagnóstico do LIVO-009, registrado como débito técnico à parte — ainda não corrigido.
**Problema atual:** Em `src/app/(auth)/register/actions.ts`, as chamadas `sendWelcomeEmail` e `sendEmailVerification` não estão envolvidas em `try/catch`. Se o provedor de e-mail (Resend) falhar, a exceção sobe depois que o `User` já foi criado no banco — o cadastro pode aparentar ter falhado para o usuário, mesmo com o registro já persistido.
**Impacto no negócio:** Potencial confusão para novos usuários (erro genérico após cadastro aparentemente bem-sucedido no banco) — mesma classe de risco já mitigada em outros pontos do sistema (PostHog, rate limit) com `try/catch` silencioso.
**Prioridade:** Média (deve ser corrigido logo, já que a rota `/cadastro` — sucessora de `/register` — pode ter o mesmo problema em `cadastro/actions.ts`, ainda não auditado especificamente para isso)
**Complexidade:** Pequena
**Dependências:** Relacionado ao LIVO-009 — pode ser resolvido como parte da unificação do fluxo de cadastro, evitando um ticket totalmente isolado.
**Critérios de aceite:** Falha no envio de e-mail de boas-vindas/verificação não impede a conclusão do cadastro nem gera erro visível incorreto para o usuário; falha é logada, nunca relançada.
**Passos técnicos:**

1. Auditar também `src/app/(auth)/cadastro/actions.ts` (não só o `register/actions.ts` antigo) para o mesmo padrão de risco, já que é a rota ativa hoje.
2. Envolver `sendWelcomeEmail`/`sendEmailVerification` em `try/catch`, logando falha via `@/lib/logger`, sem relançar.
3. Confirmar que o fluxo de auto-login/redirect prossegue normalmente mesmo se o e-mail falhar.
4. Validar em preview.

### LIVO-047 — Dicas contextuais por tela (complemento ao checklist de ativação)

**Status:** 🆕 Definido em 10/07/2026, como consequência da decisão de não usar tour guiado clássico (ver LIVO-009).
**Objetivo:** Ensinar o uso do produto "através do uso" (Princípio da Clareza do Decision Framework), em vez de um tour guiado cobrindo várias telas de uma vez no primeiro login — padrão que produtos consolidados (Notion, Linear, Stripe Dashboard) vêm abandonando por gerar abandono/desatenção.
**Problema atual:** Não existe hoje nenhum mecanismo de explicação contextual dentro das telas do sistema — o usuário aprende por tentativa e erro ou suporte manual.
**Decisão de design:** Dica pontual (ex: balão/tooltip pequeno) exibida apenas na **primeira vez** que o usuário chega em uma tela mais complexa (ex: fechamento de comanda com rateio de comissão, configuração de horários), nunca todas de uma vez. Complementa — não substitui — o checklist de ativação do LIVO-009.
**Impacto no negócio:** Reduz dependência de suporte manual para dúvidas básicas de uso; melhora percepção de facilidade do produto sem o custo de manutenção de um tour completo (que precisa ser redesenhado toda vez que uma tela muda).
**Prioridade:** Média (complementar ao LIVO-009, não bloqueante)
**Complexidade:** Pequena/Média
**Dependências:** Nenhuma bloqueante — pode ser implementado depois do LIVO-009, telas por tela, incrementalmente.
**Critérios de aceite:** Dica contextual aparece uma única vez por usuário/tela (não repete a cada visita), é dispensável a qualquer momento, e não bloqueia nenhuma ação.
**Passos técnicos:**

1. Definir mecanismo de "já visto" (ex: campo simples no `Membership` ou tabela própria registrando quais dicas já foram dispensadas por usuário).
2. Priorizar com o founder quais 2-3 telas merecem dica contextual primeiro (provavelmente fechamento de comanda, dado o histórico de complexidade já mencionado no LIVO-007).
3. Implementar componente de dica reutilizável, seguindo Design System.
4. Validar em preview antes de expandir para mais telas.

### LIVO-048 — Dois arquivos middleware.ts conflitantes no repositório (um deles é código morto)

**Status:** 🆕 Descoberto em 10/07/2026, durante diagnóstico do LIVO-041. Não executado ainda.
**Problema atual:** Existem dois arquivos `middleware.ts` — um na raiz do projeto (fora de `src/`) e outro em `src/middleware.ts`. Pela convenção do Next.js (o projeto usa `src/app/`), apenas `src/middleware.ts` é carregado; o da raiz é código morto, silenciosamente ignorado desde o commit `db0c994` (15/06/2026, "RC-1 — billing gate loop via middleware x-pathname"), que criou o arquivo novo dentro de `src/` sem remover nem migrar a lógica do antigo.
**Detalhe crítico:** o arquivo da raiz (o que **não** roda) contém toda a lógica histórica de gate de autenticação: bloquear rotas protegidas sem sessão, e redirecionar `/login`/`/register` → `/dashboard` quando o usuário já está logado. O arquivo ativo (`src/middleware.ts`) só propaga `x-pathname` nos headers, sem nenhuma lógica de auth.
**Por que não é urgente (confirmado por diagnóstico específico):** a proteção real de acesso ao dashboard **não depende do middleware**. `src/app/(dashboard)/layout.tsx` já centraliza, em Server Component/Node Runtime, `requireTermsAccepted()` (gate de termos, ativo desde o commit `7210947`) seguido de `requireMembership()` — que inclui checagem de sessão via `auth()` e `redirect("/login")` caso não exista. Confirmado que nenhum usuário sem sessão consegue ver conteúdo de nenhuma rota do grupo `(dashboard)` hoje, independente do middleware estar quebrado.
**Impacto real (menor que pareceu inicialmente):** perda de conveniência de UX — um usuário já logado que acessa `/login` ou `/register` diretamente pela URL não é redirecionado automaticamente para o dashboard (fica vendo a tela de login à toa, sem risco de segurança, só uma navegação menos fluida).
**Prioridade:** Baixa/Média (débito de clareza arquitetural — dois arquivos com o mesmo nome e propósitos conflitantes é uma fonte real de confusão para qualquer sessão futura, inclusive esta — não risco de segurança).
**Complexidade:** Pequena
**Dependências:** Nenhuma bloqueante. Relevante para o LIVO-014 (roteamento multi-marca) — antes de adicionar lógica de detecção de host no middleware, resolver esta duplicidade primeiro, para não implementar em cima do arquivo errado (que hoje não roda).
**Critérios de aceite:** Decisão tomada e executada — ou (a) portar a lógica útil de conveniência (redirect de `/login`→`/dashboard` se já logado) do middleware da raiz para dentro de `src/middleware.ts`, e apagar o arquivo da raiz; ou (b) apagar o arquivo da raiz sem migrar nada, se essa conveniência de UX não for considerada necessária.
**Passos técnicos:**

1. Decidir com o founder se vale recuperar o redirect de conveniência dentro do middleware ativo.
2. Se sim: portar a lógica para `src/middleware.ts`, usando `auth()` do Auth.js (Edge-safe, sem Prisma direto) — o middleware antigo já fazia isso corretamente, então a portabilidade é segura em relação à regra de "nunca Prisma no Edge".
3. Apagar o `middleware.ts` da raiz em qualquer cenário (é código morto de qualquer forma, ambíguo e arriscado de manter).
4. Validar em preview antes de produção.
5. Atualizar `LIVO_ENGINEERING.md` para documentar a existência de um único middleware ativo e onde vive a lógica real de proteção de rota (no layout do dashboard, não no middleware).

---

# ROADMAP DE EXECUÇÃO

## Fase 0 — Fundação de Governança e Segurança (1-2 semanas)

Prioridade: proteger o que já está em produção antes de adicionar o novo.

**Status: concluída** (exceto bloco Asaas, pausado por decisão de negócio externa ao escopo técnico).

- ~~LIVO-004 (guardrail Prisma/Edge)~~ ✅ Concluído 09/07/2026
- ~~LIVO-002 (validação webhook Asaas)~~ ⏸️ Pausado — bloco Asaas, retomar só com conta PJ aprovada
- ~~LIVO-016 (CI check migrate diff)~~ ✅ Concluído 09/07/2026
- ~~LIVO-027 (guardrail emoji)~~ ✅ Concluído 09/07/2026
- ~~LIVO-029 (consolidar LIVO_ENGINEERING.md)~~ ✅ Concluído 09/07/2026, commit `b2aef98`
- ~~LIVO-030 (diagnóstico read-only da integração Asaas)~~ ⏸️ Pausado — bloco Asaas, retomar só com conta PJ aprovada

## Fase 1 — Visibilidade e Dados (1-2 semanas)

Sem dado, não há inteligência (princípio do Operating System).

**Status: ✅ concluída (09/07/2026) — 4 de 4 itens finalizados. Complemento de débito fechado em 10/07/2026 (LIVO-005, fail-open do getRedis).**

- ~~LIVO-008 (Vercel Analytics)~~ ✅ Concluído 09/07/2026
- ~~LIVO-013 (PostHog + eventos tenant-level)~~ ✅ Concluído 09/07/2026, commit `fcbb6fa`, validado em produção
- ~~LIVO-005 (rate limiting endpoints públicos)~~ ✅ Concluído 09/07/2026, migrado para Upstash Redis, incidente de rollout resolvido, validado em produção. **Complemento fechado 10/07/2026** (commit `fdf9d85`, merge `35fd08a`).
- ~~LIVO-003 (auditoria LGPD)~~ ✅ Concluído 09/07/2026, branch de feature + preview isolado, validado em produção

## Fase 1.5 — Pendências correntes de negócio (paralelo, assim que possível)

- ⏸️ **Bloco Asaas (LIVO-030 + LIVO-002)** — pausado por decisão do founder (09/07/2026). Executar em uma única etapa, somente quando a conta PJ estiver com documentos 100% aprovados.
- ~~**LIVO-031** — Programa Embaixadores no site principal~~ ✅ Concluído 09/07/2026
- ~~**LIVO-032-A** — Redesign do site institucional~~ ✅ Concluído 09/07/2026, antecipado via **ADR-002** (ver LIVO-037 — débito de commit físico)
- **LIVO-036** — decidir destino do componente órfão `ai-section.tsx` (baixa prioridade, sem pressa)
- **LIVO-037** — commitar ADR-002, ADR-003 e (quando redigido) ADR-004 como arquivos físicos no repositório (baixa prioridade, sem pressa, mas simples de resolver)
- **LIVO-038** — estratégia de uso/revenda de dados agregados de clientes (bloqueada por aval jurídico, sem pressa)
- **LIVO-048** — dois arquivos middleware.ts conflitantes (baixa/média prioridade, descoberto 10/07/2026, sem risco de segurança confirmado)

## Fase 2 — Fechamento do Grupo D + Onboarding (2-4 semanas)

**Status: 🔄 em andamento.** LIVO-040 e LIVO-041 concluídos em 10/07/2026, ambos validados ao vivo em produção.

- ~~**LIVO-040** (bug: CTA "Começar agora" pula /register)~~ ✅ Concluído 10/07/2026, commit `377b32e`.
- ~~**LIVO-041** (bug de produção em /aceitar-termos + checkbox obrigatório de termos)~~ ✅ Concluído 10/07/2026, commits `2318dd5`, `f0421eb`, `4e210be`, `e5d7535`. Reproduzido e revalidado ao vivo pelo founder.
- 🔄 **LIVO-009** (onboarding self-service) — segue parcialmente concluído; itens derivados LIVO-040/041 resolvidos, restam LIVO-042, LIVO-043 (já resolvido por decisão arquitetural), LIVO-046 e instrumentação PostHog.
- **LIVO-042** (débito visual de /login e /cadastro) — ainda não executado.
- **LIVO-046** (try/catch em envio de e-mail no registro/cadastro) — ainda não executado; auditoria deve cobrir também `cadastro/actions.ts`, não só o `register/actions.ts` antigo.
- LIVO-006 / LIVO-007 (performance de agenda/comanda)
- LIVO-010 / LIVO-020 / LIVO-022 / LIVO-025 (exportação de relatórios — agora com regra de universalidade, sem trava de plano)
- LIVO-011 (refinamentos multi-serviço — aguardando levantamento de exemplos concretos com o founder)
- LIVO-017 (inventário — após levantamento)
- **LIVO-045** (canal obrigatório de sugestão de melhorias) — pode ser executado em paralelo, feature isolada e de baixo acoplamento.
- **LIVO-047** (dicas contextuais por tela) — complementar ao checklist de ativação do LIVO-009, pode ser priorizado logo depois, tela por tela.
- **LIVO-048** (middleware duplicado) — pode ser resolvido em paralelo, baixo risco e baixo esforço.
- **Bugs pendentes que Edu vai reportar após fechar as correções acima**

## Fase 3 — Canal e Inteligência (2-3 semanas)

- LIVO-012 (WhatsApp Z-API) — posicionamento como feature de plano ainda em aberto (ver LIVO-044)
- LIVO-018 / LIVO-026 (memória da Lívia)

## Fase 4 — Decisão de Negócio (paralelo, sem bloquear engenharia)

- LIVO-019 (comissão líquido/bruto) — aguardando decisão de Edu/sócio
- LIVO-028 (ADR das decisões pendentes, incluindo agora o reposicionamento do Prime)
- **LIVO-044** (reposicionamento do plano Prime — multiusuário com papéis) — decisão de negócio já tomada; falta especificação técnica do sistema de papéis antes de codar.
- LIVO-038 (estratégia de dados agregados) — aguardando aval jurídico

## Fase 5 — Expansão Multi-Vertical (3-6 semanas)

Só inicia após Fases 0 e 1 estarem sólidas (dados/observabilidade precisam existir antes de multiplicar verticais).

- LIVO-015 (VerticalType)
- LIVO-014 (roteamento de domínio) — nota: resolver LIVO-048 antes de implementar lógica nova no middleware.
- LIVO-021 (data-brand frontend)
- LIVO-024 (lançamento LIVO BEAUTY)

## Fase 6 — Redesign das Telas Internas (somente após Fases 0-4 fechadas e sistema estável)

- **LIVO-032-B** — Redesign do dashboard/telas logadas com base na identidade visual já aplicada ao site institucional (LIVO-032-A, concluído). Permanece bloqueado pelas condições originais (LIVO-030 concluído + errinhos corrigidos + sistema estável) — ver ADR-002.

---

# O QUE DEVE SER FEITO PRIMEIRO PARA LANÇAMENTO (próximos itens acionáveis)

1. ~~**LIVO-030 (diagnóstico)**~~ — diagnóstico read-only concluído 08/07/2026. Execução do bloco Asaas pausada por decisão do founder até aprovação da conta PJ.
2. ~~**LIVO-004** — guardrail contra Prisma no Edge~~ ✅ Concluído 09/07/2026
3. ~~**LIVO-002** — validar assinatura do webhook Asaas~~ ⏸️ Pausado, parte do bloco Asaas junto com LIVO-030
4. ~~**LIVO-008** — ativar Vercel Analytics~~ ✅ Concluído 09/07/2026
5. ~~**LIVO-031** — Programa Embaixadores no site~~ ✅ Concluído 09/07/2026
6. ~~**LIVO-016** — CI check no `migrate diff`~~ ✅ Concluído 09/07/2026
7. ~~**LIVO-027** — guardrail contra emoji em `.ts`/`.tsx`~~ ✅ Concluído 09/07/2026
8. ~~**LIVO-029** — consolidar `LIVO_ENGINEERING.md`~~ ✅ Concluído 09/07/2026, commit `b2aef98`
9. ~~**LIVO-013** — setup de PostHog com eventos tenant-level~~ ✅ Concluído 09/07/2026, commit `fcbb6fa`, validado em produção
10. ~~**LIVO-005** — rate limiting em endpoints públicos~~ ✅ Concluído 09/07/2026, migrado para Upstash Redis, validado em produção. Complemento (fail-open getRedis) fechado 10/07/2026.
11. ~~**LIVO-003** — auditoria LGPD (exportação e exclusão de dados do titular)~~ ✅ Concluído 09/07/2026, primeiro ciclo com branch de feature, validado em produção
12. ~~**LIVO-009 (fatias 1 e 2)** — onboarding self-service (cadastro em tela única + checklist de ativação)~~ ✅ Concluído, validado em produção
13. ~~**LIVO-040** — CTAs institucionais apontando para /cadastro~~ ✅ Concluído 10/07/2026, commit `377b32e`
14. ~~**LIVO-041** — bug de produção em /aceitar-termos (loop de sessão órfã) + checkbox obrigatório~~ ✅ Concluído 10/07/2026, commits `2318dd5`, `f0421eb`, `4e210be`, `e5d7535`, reproduzido e revalidado ao vivo pelo founder
15. 🔄 **Próximo item ativo:** a definir entre LIVO-046 (try/catch de e-mail, débito pequeno e rápido), LIVO-042 (identidade visual de /login e /cadastro), ou LIVO-048 (limpeza do middleware duplicado) — todos pequenos, sem dependências bloqueantes entre si.

**Fase 0 e Fase 1 seguem encerradas** (exceto o bloco Asaas, pausado por decisão de negócio, não técnica). A base de governança e segurança (guardrails de Prisma/Edge, migrate-diff, emoji, e o registro formal dessas regras em `LIVO_ENGINEERING.md`) está protegendo produção automaticamente a cada build, e a base de dados/observabilidade (Analytics, PostHog, rate limiting distribuído, LGPD) está completa.

**Fase 2 (Grupo D) avançou significativamente em 10/07/2026**: além do onboarding self-service (LIVO-009, fatias 1 e 2 já entregues), os dois bugs de produção mais urgentes descobertos ao vivo durante o diagnóstico (LIVO-040 e LIVO-041) foram diagnosticados, corrigidos e **validados em produção pelo próprio founder reproduzindo os cenários reais**, incluindo uma correção em duas tentativas para o LIVO-041 (a primeira insuficiente, a segunda — usando `signOut()` real no servidor — definitiva). Durante esse diagnóstico, surgiu também um novo item de débito técnico (LIVO-048, dois arquivos `middleware.ts` conflitantes), investigado a fundo e confirmado como não sendo risco de segurança.

Débito de processo acumulado a observar: (1) **branch de feature adotada a partir do LIVO-003** — mantida com sucesso em todos os ciclos desta sessão (LIVO-040, LIVO-041 em duas branches); manter esse padrão em todos os ciclos futuros, especialmente qualquer um que toque em dado de cliente, billing ou autenticação; (2) LIVO-037, débito de commitar ADR-002, ADR-003 e futuramente ADR-004 (Prime) como arquivos físicos; (3) `LIVO_ENGINEERING.md` precisa de atualização pontual para registrar o desvio do `phone` obrigatório/único, o padrão de branch de feature, o fechamento do fail-open do `getRedis()`, a correção de sessão órfã do LIVO-041, e a existência de um middleware duplicado (LIVO-048).

### LIVO-046 — try/catch em sendWelcomeEmail/sendEmailVerification

**Status: CONCLUÍDO (falso positivo de backlog — já implementado desde a origem)**

Verificado em 10/07/2026: o try/catch já existe em cadastro/actions.ts (linhas 222-232),
implementado no commit original 27206cb (LIVO-009, tela única de cadastro). Falha de
e-mail (Resend) é logada via log.onboarding.error e nunca bloqueia o cadastro; o
signIn() + redirect para /dashboard roda incondicionalmente logo em seguida.
git log confirma commit único no arquivo — nunca houve necessidade de correção
posterior. Item mantido no backlog por precaução na época, mas já estava resolvido
desde a criação do fluxo. Nenhuma ação de código necessária.

---

FIM DO DOCUMENTO

### LIVO-049 — Botão "Configurar percentuais" no cabeçalho parece redundante
**Status: Achado em 10/07/2026, durante validação do preview do LIVO-047.**
**Problema:** o botão "Configurar percentuais" no canto superior direito da tela de Comissões
abre um modal já fixado num único profissional (ex: "Comissão — Diego Silva"), sem opção de
escolher qual profissional configurar. Logo abaixo na mesma tela já existe a seção
"Configuração de Comissões por Barbeiro", com um botão "Editar" individual para cada
profissional — que já cobre esse mesmo objetivo de forma completa e clara.
**Hipótese a investigar:** o botão do cabeçalho pode ser código antigo/duplicado, esquecido
de uma versão anterior da tela, antes da seção de configuração por barbeiro existir.
**Prioridade:** a definir com o founder (provavelmente baixa — não é bug funcional, é
possível redundância de UI).
**Complexidade:** a diagnosticar (entender se o botão do cabeçalho tem alguma diferença de
comportamento real, ou se pode ser removido com segurança).
**Dependências:** Nenhuma. Investigar em branch própria, isolado do LIVO-047.
