# LIVO — BACKLOG DE ENGENHARIA E PRODUTO

Documento gerado pelo CTO/PM Assistente do ecossistema LIVO.
Base: LIVO_INDEX → LIVO_OPERATING_SYSTEM → LIVO_DECISION_FRAMEWORK + estado atual conhecido do projeto (SALA Tecnologia / LIVO BARBER).

> Observação de origem: os tickets abaixo foram derivados do estado conhecido do projeto (features em produção, itens do "Grupo D", decisões de negócio pendentes, riscos técnicos documentados como aprendizados). Nenhum bug específico foi reportado nesta sessão — para tickets de bug mais cirúrgicos, anexe logs, stack traces ou passos de reprodução.

---

## 1. BUGS

### LIVO-034 — [CONCLUÍDO 09/07/2026] Footer duplicado em /produto e /planos

**Status:** ✅ Resolvido e deployado (branch preview/redesign-institucional, mesclado em main).
**Problema que era:** `PublicFooter` (src/components/public-footer.tsx) tinha uma denylist de rotas onde não deveria renderizar, mas não incluía `/produto` e `/planos` — essas rotas renderizavam tanto o `Footer` da landing quanto o `PublicFooter` empilhados na mesma página. Bug pré-existente desde o commit 15107c9 (extração de /produto e /planos da Home), exposto durante a execução do LIVO-032-A.
**O que foi feito:** Adicionado `/produto` e `/planos` à denylist de `PublicFooter`, mesma lógica já usada para `/`. Verificado que `/oferta-30-dias`, `/oferta-60-dias` e `/vip` não tinham o mesmo problema.
**Validação:** `npx tsc --noEmit` limpo, confirmado visualmente em preview do Vercel.

### LIVO-001 — Nenhum bug ativo reportado

**Objetivo:** Manter rastreabilidade de defeitos.
**Problema atual:** Nenhum bug foi reportado com logs/reprodução nesta sessão.
**Impacto no negócio:** N/A até que haja reporte.
**Prioridade:** N/A
**Complexidade:** N/A
**Dependências:** Envio de stack trace, print, ou passos de reprodução por Edu.
**Critérios de aceite:** Ticket será substituído por bug real assim que houver reporte.
**Passos técnicos:** Aguardando input.

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

### LIVO-003 — Auditoria LGPD: exportação e exclusão de dados do titular

**Objetivo:** Garantir conformidade com LGPD para clientes finais (CRM) e assinantes do Clube.
**Problema atual:** Não há fluxo documentado de exportação/exclusão de dados pessoais a pedido do titular.
**Impacto no negócio:** Risco regulatório e reputacional; bloqueador para contratos B2B maiores.
**Prioridade:** Alta
**Complexidade:** Média
**Dependências:** Definição jurídica de escopo de dados pessoais (CRM, comandas, OTP).
**Critérios de aceite:** Existe endpoint/processo interno para exportar e para anonimizar/excluir dados de um cliente final mediante solicitação, respeitando os registros protegidos (TX Barbearia, WaitlistLeads).
**Passos técnicos:**

1. Mapear todas as tabelas com dado pessoal de cliente final.
2. Desenhar fluxo de exportação (JSON) e anonimização (sem quebrar histórico financeiro/comissão).
3. Implementar com escopo por `barbershopId`.
4. Documentar processo em doc oficial (governança).

### LIVO-004 — [CONCLUÍDO 09/07/2026] Guardrail contra Prisma em Edge Runtime (regressão do JWTSessionError)

**Status:** ✅ Resolvido, testado e ativo no pipeline de build.
**Problema que era:** A prevenção do bug que já derrubou o login de toda a base dependia de conhecimento tácito ("nunca usar Prisma em callbacks jwt/session"), sem barreira automatizada.
**Achado durante a execução:** ESLint não está instalado no projeto (`next lint` não funciona — sem `eslint.config.*` nem dependência instalada). A solução original prevista (regra ESLint) foi substituída por script standalone em Node puro.
**O que foi feito:** Criado `scripts/guardrail-prisma-edge.js` — isola o corpo dos callbacks `jwt` e `session` em `src/auth.ts` via parsing de chaves balanceadas e bloqueia (exit 1) se detectar uso de `db.`, `prisma.`, `PrismaClient` ou import de `@prisma/client` dentro desses blocos, sem falso-positivo em `authorize`/`events` (que usam Prisma legitimamente em Node Runtime, fora do Edge). Plugado em `"build"` no `package.json` — protege todo deploy na Vercel automaticamente. Também disponível isolado via `npm run guardrail:prisma-edge`.
**Validação:** Testado em 3 cenários — arquivo real (OK), violação direta injetada no `jwt` (bloqueou, exit 1), violação aninhada em `if` no `session` (bloqueou, exit 1). `npx tsc --noEmit` limpo. `auth.ts` restaurado ao original após os testes.
**Commit:** `da62f0a` — comitado junto com LIVO-008 (Vercel Analytics), pois ambos os tickets modificavam `package.json` de forma entrelaçada; decisão pragmática de commit único, mensagem citando os dois tickets.
**Débito relacionado:** A ausência de ESLint no projeto também afetou LIVO-016 e LIVO-027 (ambos previstos originalmente como "regra de lint") — a mesma decisão de abordagem (script standalone vs. instalar ESLint do zero) foi confirmada e aplicada em ambos.

### LIVO-005 — Auditoria de rate limiting em endpoints públicos (OTP, booking público, referral)

**Objetivo:** Garantir que endpoints públicos não fiquem expostos a abuso/enumeração.
**Problema atual:** OTP já é rate-limited; não há confirmação sobre página pública de booking e geração de códigos de referral.
**Impacto no negócio:** Risco de abuso (spam de SMS/WhatsApp, geração massiva de códigos, scraping de agenda).
**Prioridade:** Alta
**Complexidade:** Pequena
**Dependências:** Nenhuma
**Critérios de aceite:** Todos os endpoints públicos sensíveis têm rate limit documentado e testado.
**Passos técnicos:**

1. Listar todos os endpoints públicos (sem auth).
2. Verificar rate limit existente em cada um.
3. Implementar onde faltar (mesma abordagem usada no OTP).

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

### LIVO-009 — Melhorias de onboarding self-service (Grupo D)

**Objetivo:** Reduzir fricção/abandono no cadastro de novas barbearias sem intervenção manual.
**Problema atual:** Onboarding atual (CPF check, ToS, criação de conta) tem pontos de melhoria identificados mas não implementados.
**Impacto no negócio:** Afeta diretamente ativação (Growth) e CAC efetivo.
**Prioridade:** Alta
**Complexidade:** Média
**Dependências:** Nenhuma
**Critérios de aceite:** Taxa de conclusão do onboarding aumenta (medir antes/depois via PostHog quando disponível, ou log manual).
**Passos técnicos:**

1. Mapear etapas atuais do onboarding e pontos de abandono prováveis.
2. Redesenhar etapas seguindo Princípio da Clareza/Simplicidade (Decision Framework).
3. Implementar incrementalmente, validando cada etapa em produção.

### LIVO-010 — UX de exportação de relatórios (Grupo D)

**Objetivo:** Permitir que o dono da barbearia leve dados para fora da plataforma (contador, planilhas).
**Problema atual:** Módulo de Relatórios não possui exportação (CSV/PDF).
**Impacto no negócio:** Retenção — donos de barbearia frequentemente pedem isso ao contador; ausência gera atrito.
**Prioridade:** Média
**Complexidade:** Média
**Dependências:** LIVO-013 (backend de exportação)
**Critérios de aceite:** Usuário consegue exportar relatório financeiro/comissão em CSV a partir da tela de Relatórios.
**Passos técnicos:**

1. Definir quais relatórios exportar primeiro (financeiro, comissão, "a receber" de pacotes).
2. Design do botão/fluxo de exportação seguindo Design System.
3. Integrar com backend de geração de arquivo.

### LIVO-011 — Refinamentos de UX em agendamento multi-serviço

**Objetivo:** Reduzir confusão visual quando um agendamento tem múltiplos serviços/profissionais.
**Problema atual:** Item listado no Grupo D como refinamento pendente, sem detalhamento de qual fricção específica.
**Impacto no negócio:** Experiência na tela mais usada do produto (Agenda).
**Prioridade:** Média
**Complexidade:** Pequena/Média
**Dependências:** Levantamento específico de feedback com Edu (quais telas exatas).
**Critérios de aceite:** A definir após levantamento.
**Passos técnicos:**

1. Levantar com Edu exemplos concretos de confusão relatada por usuários.
2. Priorizar 1-2 ajustes de maior impacto.
3. Implementar seguindo padrões de componentização (Design System).

### LIVO-032 — Redesign completo do sistema baseado em templates de referência

**Status:** Desmembrado em dois sub-tickets via **ADR-002** (09/07/2026), antecipando o site institucional em relação às condições de bloqueio originais. Ver `ADR-002-redesign-antecipado.md`.

#### LIVO-032-A — Redesign do site institucional (livobarber.com.br)

**Status:** ✅ **Concluído e publicado em produção** (09/07/2026).
**Escopo:** Header, Hero, Como Funciona, Funcionalidades, Planos, Embaixadores (LIVO-031), Footer — apenas rotas do site institucional (`/`, `/produto`, `/planos`).
**O que foi feito:**

- Nova identidade visual: fundo preto puro, branco/cream como acento principal em texto/badges/labels/ícones, vermelho (`#E43B49` → `#C62E3C`) nos botões de CTA (exceto o botão da seção Embaixadores, que mantém tratamento dourado próprio).
- Fonte Poppins (via `next/font/google`) nos headlines e wordmark, substituindo a sans genérica anterior — mantendo Satoshi intacta no restante do produto.
- Wordmark "L I V O" fiel à identidade oficial (letras espaçadas, sem marcador/bolinha, branco).
- Ícones emoji substituídos por `lucide-react` (line-art) em `features.tsx` e `ai-section.tsx`.
- Variant `red` adicionado ao `Button` compartilhado (aditivo — variant `gold` preservado para uso exclusivo da seção Embaixadores).
- Grade de Funcionalidades expandida de 4 para 6 cards (todas as features já existentes no array, sem espaço vazio).
- Navegação do header expandida para 5 itens (Produto, Planos, Embaixadores, Entrar, Começar agora), reduzindo dependência do rodapé para ações comuns.
- Bug de empilhamento CSS no menu mobile corrigido (backdrop de blur cobria os links do menu por falta de `z-index` explícito).
- Contraste do copyright/CNPJ no rodapé corrigido (`#27272A` → `#A1A1AA`).
  **Não incluído neste escopo:** novo mockup de dashboard no Hero (mantido com paleta antiga, por representar uma tela real ainda não redesenhada).
  **Validação:** `npx tsc --noEmit` limpo em todas as etapas; responsividade confirmada em mobile e na faixa crítica de tablet (768–900px).

#### LIVO-032-B — Redesign das telas internas (dashboard, agenda, comandas, etc.)

**Status:** Bloqueado — mantém as condições originais do ADR anterior a este desmembramento.
**Dependências (BLOQUEADO até):**

1. LIVO-030 (migração Asaas) concluída
2. "Errinhos" pendentes reportados e corrigidos
3. Sistema estável em produção
   **Racional de manter bloqueado:** alterar UI logada tem risco direto sobre a operação diária de barbearias pagantes — diferente do site institucional, que é superfície separada do produto (não toca em billing, autenticação ou dados de cliente).
   **Passos técnicos (somente quando desbloqueado):** os mesmos já previstos originalmente — identificar fontes/paleta exatas, consolidar Design System formal, aplicar por módulo de forma incremental, validar cada tela isoladamente em produção.

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
**Nota de processo (débito registrado):** Push feito diretamente em `main`, sem branch de feature/preview isolado — repete o mesmo padrão do LIVO-008. Sinalizado como débito de processo: configurar branch de feature (com preview deployment próprio) nas próximas sessões, em vez de validar direto em produção.

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

Ver critérios técnicos em LIVO-010 (mesmo ticket, componente de frontend).
**Prioridade:** Média | **Complexidade:** Pequena | **Dependências:** LIVO-020

### LIVO-023 — Polimento de fluxo de onboarding self-service (frontend)

Componente de frontend do LIVO-009.
**Prioridade:** Alta | **Complexidade:** Média | **Dependências:** LIVO-009

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

Consolidação de LIVO-010 + LIVO-020 + LIVO-022 como entrega de produto.
**Prioridade:** Média | **Complexidade:** Média

### LIVO-026 — Memória da Lívia AI (feature completa)

Consolidação de LIVO-018 como entrega de produto visível ao usuário (Lívia "lembra" de conversas anteriores).
**Prioridade:** Alta | **Complexidade:** Grande

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
**Problema atual:** Duas decisões de negócio estão explicitamente adiadas sem ADR formal.
**Impacto no negócio:** Risco de retrabalho e inconsistência se a decisão for tomada informalmente depois.
**Prioridade:** Média
**Complexidade:** Pequena
**Dependências:** Decisão de negócio com sócio (bloqueador externo, não técnico).
**Critérios de aceite:** Existe um documento ADR rastreável assim que a decisão for tomada.
**Passos técnicos:**

1. Criar template de ADR (se ainda não existir) seguindo padrão já usado para multi-vertical.
2. Registrar as duas decisões pendentes como "ADR em aberto".
3. Preencher assim que Edu decidir.

### LIVO-029 — [CONCLUÍDO 09/07/2026] Consolidação de guardrails de arquitetura em um único documento de Engineering

**Status:** ✅ Resolvido, testado e ativo na hierarquia documental.
**Problema que era:** LIVO_INDEX referenciava `LIVO_ENGINEERING.md` como documento de Nível 7, mas as regras invioláveis reais do projeto (Prisma fora do Edge, `$transaction` como callback, `@@map()` só em tabela, escopo por `barbershopId`, registros protegidos, os 3 guardrails já implementados) viviam apenas em memória de sessão e convenção tácita.
**Achado crítico durante a execução:** já existia um `LIVO_ENGINEERING.md` versionado no repositório (990 linhas), mas era um template genérico/aspiracional — arquitetura em camadas, multi-tenant, testes, LGPD, criptografia, CI/CD, visão de ecossistema Barber/Beauty/Med/Pet/Fit/Services — sem nenhuma referência concreta ao projeto real. Confirmado via busca por termos-chave (`TX Barbearia`, `WaitlistLead`, `barbershopId`, `@@map`, `guardrail`, `Asaas`, `CNPJ`, `Auth.js`, `Edge Runtime`): zero ocorrências no arquivo anterior. A substituição integral foi considerada segura — não havia conteúdo concreto a mesclar, apenas a estrutura de scaffold do `create-next-app`/boilerplate nunca preenchida com as regras reais.
**O que foi feito:** Reescrita completa do documento (990 → 76 linhas), cobrindo: registros protegidos (TX Barbearia, WaitlistLeads), regras de schema/transaction/barbershopId/migrate-diff, regra de Prisma fora do Edge Runtime, regra de encoding/emoji, os 3 guardrails automatizados com mecanismo e ticket/commit de origem, padrões de execução (sequenciamento, Neon SQL Editor vs. Prisma Studio, governança de mudança) e débito técnico conhecido (`ASAAS_API_KEY` órfã, 4 migrations pré-baseline, `ai-section.tsx` órfão).
**Detalhe de execução:** `Set-Content -Encoding UTF8` do PowerShell 5.1 gravou o arquivo com BOM (`EF BB BF`), inconsistente com o restante do repositório (UTF-8 sem BOM) — corrigido antes do commit via `[System.IO.File]::WriteAllText` com `UTF8Encoding($false)`.
**Validação:** `npx tsc --noEmit` limpo (0 erros) após a remoção do BOM.
**Commit:** `b2aef98` — escopo isolado (`LIVO_ENGINEERING.md`, 76 inserções / 920 remoções), sem incluir `LIVO_BACKLOG.md`.

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

**Status: em andamento.**

- ~~LIVO-008 (Vercel Analytics)~~ ✅ Concluído 09/07/2026
- ~~LIVO-013 (PostHog + eventos tenant-level)~~ ✅ Concluído 09/07/2026, commit `fcbb6fa`, validado em produção
- **LIVO-005 (rate limiting endpoints públicos)** ← próximo item ativo da fila
- LIVO-003 (auditoria LGPD)

## Fase 1.5 — Pendências correntes de negócio (paralelo, assim que possível)

- ⏸️ **Bloco Asaas (LIVO-030 + LIVO-002)** — pausado por decisão do founder (09/07/2026). Executar em uma única etapa, somente quando a conta PJ estiver com documentos 100% aprovados.
- ~~**LIVO-031** — Programa Embaixadores no site principal~~ ✅ Concluído 09/07/2026
- ~~**LIVO-032-A** — Redesign do site institucional~~ ✅ Concluído 09/07/2026, antecipado via **ADR-002** (ver seção 4)
- **LIVO-036** — decidir destino do componente órfão `ai-section.tsx` (baixa prioridade, sem pressa)

## Fase 2 — Fechamento do Grupo D (2-4 semanas)

Gaps de produto já identificados e priorizados internamente.

- LIVO-009 / LIVO-023 (onboarding self-service)
- LIVO-006 / LIVO-007 (performance de agenda/comanda)
- LIVO-010 / LIVO-020 / LIVO-022 / LIVO-025 (exportação de relatórios)
- LIVO-011 (refinamentos multi-serviço)
- LIVO-017 (inventário — após levantamento)
- **Bugs pendentes que Edu vai reportar após fechar as correções acima**

## Fase 3 — Canal e Inteligência (2-3 semanas)

- LIVO-012 (WhatsApp Z-API)
- LIVO-018 / LIVO-026 (memória da Lívia)

## Fase 4 — Decisão de Negócio (paralelo, sem bloquear engenharia)

- LIVO-019 (comissão líquido/bruto) — aguardando decisão de Edu/sócio
- LIVO-028 (ADR das decisões pendentes)

## Fase 5 — Expansão Multi-Vertical (3-6 semanas)

Só inicia após Fases 0 e 1 estarem sólidas (dados/observabilidade precisam existir antes de multiplicar verticais).

- LIVO-015 (VerticalType)
- LIVO-014 (roteamento de domínio)
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
10. **LIVO-005** — rate limiting em endpoints públicos ← próximo item ativo (Fase 1)

**Fase 0 está encerrada** (exceto o bloco Asaas, pausado por decisão de negócio, não técnica). A base de governança e segurança (guardrails de Prisma/Edge, migrate-diff, emoji, e agora o registro formal dessas regras em `LIVO_ENGINEERING.md`) está protegendo produção automaticamente a cada build.

Concluído fora da ordem original, por decisão do founder (ver ADR-002): **LIVO-032-A** (redesign do site institucional) e **LIVO-034** (footer duplicado, achado durante o LIVO-032-A) — publicados em produção em 09/07/2026, antecipando parte da Fase 6.

Concluído dentro da Fase 0: **LIVO-004** (guardrail Prisma/Edge Runtime) — 09/07/2026. **LIVO-016** (guardrail migrate diff / DROP) — 09/07/2026, commit `f35fbb8`. **LIVO-027** (guardrail emoji + limpeza de 34 ocorrências legadas) — 09/07/2026, commit `db0b13e`. **LIVO-029** (consolidação de `LIVO_ENGINEERING.md`, substituindo template genérico sem conteúdo real) — 09/07/2026, commit `b2aef98`.

Concluído dentro da Fase 1: **LIVO-008** (Vercel Analytics) — 09/07/2026, validado em produção com coleta de dados confirmada. **LIVO-013** (PostHog + eventos tenant-level) — 09/07/2026, commit `fcbb6fa`, validado em produção (evento `agendamento_criado` confirmado no dashboard PostHog, conta Vortex).

Pausado por decisão de negócio (09/07/2026): bloco Asaas completo (**LIVO-030** + **LIVO-002**), agrupado para execução em etapa única quando a conta PJ for aprovada.

A partir daqui, o próximo item ativo da Fase 1 é **LIVO-005** (rate limiting em endpoints públicos), seguido de LIVO-003 (auditoria LGPD) — visibilidade e dados já com LIVO-008/LIVO-013 concluídos, base para o Grupo D, o WhatsApp Z-API, o lançamento de LIVO BEAUTY e o redesign das telas internas (LIVO-032-B).

---

FIM DO DOCUMENTO
