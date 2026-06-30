# LIVO PROJECT STATUS

Version: 2.0
Last Updated: 26/06/2026
Status: MVP Completo — Combos + Clube de Assinatura + Design System Unificado em produção
Source of Truth: LIVO_FUNCTIONAL_AUDIT.md + LIVO_PRODUCTION_GAP.md

---

# VISÃO GERAL

O LIVO é atualmente um sistema operacional de gestão para barbearias.

O produto já possui:

- Autenticação
- Multi-tenant
- Agenda
- Clientes
- Comandas
- Estoque
- Relatórios
- Billing Asaas
- Convites
- IA Lívia
- Gestão de Profissionais (em finalização)

O sistema encontra-se funcional para operação real de uma barbearia.

---

# MATURIDADE ATUAL

Produto ............. 8.5/10
UX .................. 8.5/10
Engenharia .......... 8.0/10
Escalabilidade ...... 7.0/10
IA .................. 5.5/10
Segurança ........... 7.5/10

Score Geral: 7.9/10

Score Funcional (20+ módulos): 9.0/10

---

# O QUE ESTÁ PRONTO

## Auth

Status: Produção

- Credentials
- Google OAuth (PKCE + state)
- JWT
- Middleware protegido

---

## Agenda

Status: Produção ⚠️ Integração GAP-05 em andamento

- Visualização mensal
- Visualização semanal
- Visualização diária
- Criação de agendamentos
- ✅ Edição de agendamentos (GAP-01)
- ✅ AgendaBoard (board operacional) — componente completo, aguarda ativação em page.tsx (GAP-05-C1)
- ✅ Slots de 10 minutos — arquitetura migrada (GAP-05-A0+A1, 10/06/2026)
  - src/lib/slot-config.ts: fonte única (SLOT_MINUTES=10, SLOT_HEIGHT=20)
  - 72 slots/dia (8h–20h), TimeColumn com labels a cada 60min
  - availability.ts e day-calendar.tsx sincronizados

**Pendente GAP-05:**

- ⏳ B1: Fix timezone em slotToDateISO (sufixo Z hardcoded = UTC)
- ⏳ B2: Fix clientEmail: "" → null em createQuickAppointment
- ⏳ B3: @@index([professionalId, date, endTime]) migration
- ⏳ B4: Conflict validation em createQuickAppointment/updateAppointment
- ⏳ C1: Ativar AgendaBoard em page.tsx via ?view=operacional
- ⏳ D1-D3: Integração Agenda ↔ Clientes (upsert + totalVisits/lastVisitAt)
- ⏳ E1-E2: Integração Agenda ↔ Comandas (Comanda.appointmentId)

---

## Clientes

Status: Produção

- CRUD completo (criar + editar + notas + bloquear) ← GAP-02 concluído
- Histórico
- Origem
- Escopo por role

---

## Comandas

Status: Produção

- Abertura
- Fechamento
- Múltiplos pagamentos (8 métodos)
- Comissão automática

---

## Estoque

Status: Produção

- Produtos
- Categorias
- Movimentações (entrada/saída)

---

## Relatórios

Status: Produção

- Receita
- Ticket médio
- Ranking por profissional
- Evolução financeira

---

## Comissões

Status: Produção

- Cálculo automático no fechamento de comanda
- Separado por serviços e produtos
- Visão por período e por profissional

---

## Billing

Status: Produção

- Trial 30d (60d leads TX)
- PIX via Asaas (mensal/anual)
- Webhook de confirmação
- Lifetime protegido

---

## Convites

Status: Produção

- Envio por email com role e comissão pré-configurada
- Aceitar via link (conta nova ou existente)
- Revogação e expiração

---

## Marketing

Status: Produção

- Lista de clientes sumidos (30/60/90 dias)
- Aniversariantes do mês
- Filtro por barbeiro

---

## Lívia

Status: MVP

- Chat funcional
- Contexto operacional

Limitações:

- Sem memória persistente
- Sem acesso a dados reais via tool calls
- Rate limiter in-memory (não distribuído)

---

## Profissionais

Status: Produção ← GAP-03 concluído

- ✅ `actions.ts` — 4 Server Actions (criar, editar, toggle, listar)
- ✅ `page.tsx` + `loading.tsx` — Server Component + skeleton
- ✅ `profissionais-client.tsx` — UI completa (lista, modais, toggle com confirmação)
- ✅ Navegação no sidebar integrada

---

## Combos / Pacotes

Status: Produção ✅ (26/06/2026)

- CRUD completo (nome, descrição, preço único, itens com serviços e produtos)
- Comissão específica por combo (override da engine global)
- Agrupamento visual no PDV com badge "Combo"
- Economia calculada vs preço avulso
- getCombosAtivos para seleção no PDV
- Camada de comissão: combo tem prioridade sobre override → global

## Clube de Assinatura

Status: Produção ✅ (26/06/2026) — feature flag por barbearia (clubEnabled)

- Schema: SubscriptionPlan, SubscriptionPlanItem, SubscriptionPlanProductDiscount, ClientSubscription, SubscriptionUsage, ClientVerificationCode
- Feature flag: clubEnabled por barbearia, sidebar com cadeado "Em breve" quando desativado
- CRUD de planos: nome, preço, serviços com cota/mês, descontos por produto (% ou R$), comissão fixa ou nenhuma
- Conexão Asaas: subconta por barbearia (walletId salvo, apiKey nunca armazenada)
- Webhook próprio /api/webhooks/asaas/clube: token separado, ordenação por lastBillingEventAt, idempotência
- Login do cliente: OTP por telefone (SHA-256, rate limit 3/hora, expiração 10min, JWT httpOnly 60 dias)
- Área pública /[slug]/clube: listagem de planos com economia, fluxo assinar → login → checkout Asaas
- Área logada: plano ativo, saldo do ciclo com barra de progresso, cancelamento self-service
- PDV: reconhece assinante ativo, exibe serviços do plano com saldo, lança como coberto (R$0), decrementa cota
- Comissão: camada plano na engine (combo → plano → override → global)
- Dashboard /dashboard/clube/assinantes: MRR, ativos, cancelamentos, uso do ciclo, quem vendeu
- Conformidade BaaS: SeloAsaas em todas as telas de pagamento (variant auto/dark), suporte Asaas visível
- Cláusula contratual Asaas pendente nos Termos de Uso

## Upload de Foto de Profissional

Status: Produção ✅ (26/06/2026)

- Vercel Blob Store público (livo-blob) criado e conectado
- BLOB_READ_WRITE_TOKEN via OIDC no Vercel
- try/catch robusto no cliente e na action (nunca trava o spinner)
- Validação de tipo (jpeg/png/webp) e tamanho (5MB)

## Design System Unificado

Status: Produção ✅ (26/06/2026)

- Fonte Satoshi como primária
- CSS custom properties completas (--bg-base, --bg-card, --bg-card-elevated, --border, --text-\*)
- Dark theme padrão, light theme via [data-theme="light"]
- Componente SeloAsaas com variant auto/dark/light

---

# EM CONSTRUÇÃO

## GAP-05 — Integração Total da Agenda (em andamento)

**Próxima etapa imediata: GAP-05-B1 (timezone fix)**

- ⏳ B1: Fix timezone `slotToDateISO` — sufixo `Z` hardcoded gera UTC em vez de UTC-3
- ⏳ B2: Fix `clientEmail: ""` → `null` em `createQuickAppointment`
- ⏳ B3: Migration `@@index([professionalId, date, endTime])`
- ⏳ B4: Conflict validation nos server actions de agendamento
- ⏳ C1: Ativar `AgendaBoard` em `page.tsx` via `?view=operacional`
- ⏳ D1: Client upsert em `createQuickAppointment` (via `$transaction`)
- ⏳ D2: `totalVisits`/`lastVisitAt` ao marcar `completed`
- ⏳ D3: Autocomplete de clientes no `NewAppointmentModal`
- ⏳ E1: Botão "Abrir Comanda" via `Comanda.appointmentId @unique`
- ⏳ E2: Navegação direta Agenda → Comanda
- ⏳ F1: Deprecar `/agenda/new`

## Outros módulos pendentes

- CRUD Serviços (página dedicada)
- Horários individuais por profissional
- Uploads (logo, avatar, fotos)
- Booking Público — melhorias

---

# AUSENTE

- Event Layer
- Audit Layer
- WhatsApp Assistant
- Analytics Platform
- Automations
- Knowledge Graph
- Multi-Vertical Framework
- Testes automatizados
- Observabilidade (Sentry, Logger)

---

# SPRINT P0 — CONCLUÍDO ✅

~~P0.1 Role hardcoded~~ ✅ RESOLVIDO 09/06/2026
~~P0.2 Debug routes expostos~~ ✅ RESOLVIDO 09/06/2026
~~P0.3 Rate limiting ausente na Lívia~~ ✅ RESOLVIDO 09/06/2026
~~P0.4 planStatus enum drift~~ ✅ RESOLVIDO 09/06/2026
~~P0.5 Índices de banco ausentes~~ ✅ RESOLVIDO 09/06/2026

---

# GAPS PRIORITÁRIOS (ver LIVO_PRODUCTION_GAP.md)

## P1 — Sprint concluído ✅

- ✅ GAP-01: Edição de agendamento — commit `115d359`
- ✅ GAP-02: Edição completa de cliente — commit `feat(clientes)`
- ✅ GAP-03: Gestão de profissionais — commit `a2ea1fc`
- ✅ GAP-04: PaymentMethod enum drift — commit `9fd8d66`

## GAP-05 — Integração Total da Agenda ⚠️ EM ANDAMENTO

- ✅ A0: `src/lib/slot-config.ts` — fonte única criada — commit `52be849`
- ✅ A1: Migração para 10 minutos — `SLOT_MINUTES=10`, `SLOT_HEIGHT=20` — commit `52be849`
- ⏳ B1: Timezone fix (`slotToDateISO` — sufixo Z hardcoded)
- ⏳ B2–B4: Data integrity (clientEmail null, @@index, conflict validation)
- ⏳ C1: Ativar AgendaBoard em page.tsx
- ⏳ D1–D3: Integração Agenda ↔ Clientes
- ⏳ E1–E2: Integração Agenda ↔ Comandas
- ⏳ F1: Deprecar /agenda/new

## P2 — Produto completo

- GAP-06: Upload de imagens
- GAP-07: Página dedicada de serviços
- GAP-10: Fluxo pós-suspensão
- GAP-11: E-mail fim de trial
- GAP-12: Histórico de movimentações de estoque
- GAP-13: Export de relatórios

---

# HISTÓRICO DE SPRINTS

## Sprint P0 — Estabilização (09/06/2026)

Auditoria funcional completa de 18 módulos.
5 blockers críticos identificados e resolvidos.
Documentação de produção criada (LIVO_FUNCTIONAL_AUDIT.md + LIVO_PRODUCTION_GAP.md).

## Sprint P1 — GAP-01 a GAP-04 (09/06/2026 — concluído)

GAP-01: Edição de agendamentos — commit 115d359
GAP-02: Edição completa de clientes — modal completo + updateClient server action
GAP-03: Gestão de profissionais — CRUD completo + navegação sidebar
GAP-04: PaymentMethod enum drift — 8 métodos de pagamento mapeados

## Sprint GAP-05 — Integração Total da Agenda (10/06/2026 — em andamento)

**Fases A concluídas (10/06/2026) — commit 52be849:**

- A0: src/lib/slot-config.ts criado como fonte única de configuração de slots
- A1: Migração para 10 minutos (SLOT_MINUTES=10, SLOT_HEIGHT=20, TOTAL_SLOTS=72)
  - agenda-board.tsx: constantes migradas, TimeColumn labels a cada 60min (i%6)
  - availability.ts: SLOT_INTERVAL agora deriva de SLOT_CONFIG
  - day-calendar.tsx: SLOTS dinâmico, getTimeSlot snapping 10min, borders em horas cheias

**Próxima fase: B1 — Timezone fix (slotToDateISO)**

---

## Sprint GAP-05 FIX B / GAP-06 / GAP-07 — Consistência e Inteligência (10-11/06/2026)

### Concluído:

**E2 — Navegação bidirecional Appointment ↔ Comanda (10/06/2026):**

- `agenda-board.tsx`: botão "Ver Comanda" quando `comandaId` existe; "Abrir Comanda" oculto se já existe comanda
- `comandas/actions.ts`: deduplicação em `abrirComanda` — redireciona para comanda existente se `appointmentId` já vinculado

**F1 — Remoção segura de /dashboard/agenda/new (10/06/2026):**

- Deletados: `agenda/new/actions.ts`, `agenda/new/new-appointment-form.tsx`, `agenda/new/page.tsx` (678 linhas)
- Zero callers externos confirmados antes da deleção

**GAP-05 FIX B — Sincronização bidirecional Appointment ↔ Comanda (10/06/2026):**

- `fecharComanda`: sincroniza appointment vinculado para `completed` (idempotente, `notIn: ["completed","cancelled"]`)
- `cancelarComanda`: sincroniza appointment vinculado para `cancelled`
- `updateAppointmentStatusCore`: sincroniza comanda aberta para `cancelled` quando appointment cancelado
- Anti-loop: cada direção escreve direto no DB sem chamar a função da outra direção

**GAP-06-A — Receita unificada no dashboard/page.tsx (10/06/2026):**

- `todayRevenue` agora usa `comanda.aggregate(_sum.totalInCents)` onde `status="closed"` e `closedAt` dentro do dia
- Removido uso de `appointment.service.priceInCents` como receita

**GAP-06-B/C — CRM baseado em comandas fechadas (10/06/2026):**

- Removido `totalVisits`/`lastVisitAt` de `createAppointmentCore`
- `fecharComanda`: step 5 = `client.update({ totalVisits: { increment: 1 }, lastVisitAt: new Date() })` para clientId não-null
- Walk-ins com `clientId` agora são contabilizados corretamente ao fechar comanda

**GAP-06-D — Deduplicação de clientes por clientId FK (10/06/2026):**

- `relatorios/actions.ts`: `clientesUnicos` usa `new Set(comandas.map(c => c.clientId).filter(id => id !== null)).size`
- Removida deduplicação por `clientName.toLowerCase().trim()`

**GAP-07 — Camada de inteligência de cliente (11/06/2026):**

- Criado: `src/app/(dashboard)/dashboard/analytics/client-intelligence.ts`
- `getClientIntelligence(thresholds?)`: KPIs por cliente — status (ativo/em_risco/inativo), diasSemVisita, ticketMedio, intervaloMedioVisitas (dinâmico por cliente)
- `getAgendaIntelligence(periodo?)`: slots por hora (quente/normal/ocioso), ranking profissionais, melhorHorario
- `getReativacaoSugestoes(thresholds?, limite?)`: lista priorizada de clientes para reativação (prioridade alta/media por receita/visitas)
- Leitura pura — zero writes ao CRM, Comanda, Appointment ou agenda

**GAP-08 — Motor de recomendações acionáveis (11/06/2026):**

- Criado: `src/app/(dashboard)/dashboard/analytics/recommendation-engine.ts`
- `getRecommendations(barbershopId, thresholds?, periodo?)`: função pura — orquestra GAP-07 + engine em paralelo
- 4 tipos de recomendação: `VIP_RISK`, `REACTIVATION`, `REVENUE_OPTIMIZATION`, `CAPACITY_OPTIMIZATION`
- Campos: `id` (determinístico), `type`, `severity` (low/medium/high), `reason`, `suggestedAction`, `estimatedImpact` (baixo/médio/alto), `metadata`
- Regras: VIP_RISK (R$300+ ou 8+ visitas em risco/inativo), REACTIVATION (em_risco/inativos sem sobreposição VIP), REVENUE_OPTIMIZATION (horários ociosos agrupados), CAPACITY_OPTIMIZATION (<40% do top performer)
- Leitura pura — zero writes, zero automação, zero auth

**GAP-09 — UI de Insights (11/06/2026) ✅ CONCLUÍDO:**

- `src/app/(dashboard)/dashboard/insights/loading.tsx`: skeleton animate-pulse, 3 blocos (VIP + Reativação + Otimização)
- `src/app/(dashboard)/dashboard/insights/page.tsx`: Server Component com `requireRole(["owner","reception"])`, `getRecommendations(barbershopId)`, 3 seções + empty state
  - Auth boundary exclusivo em page.tsx; engine 100% puro
  - Cards com left-border colorida por tipo, badges TYPE+SEVERITY+IMPACT, metadata line
  - Empty state quando `summary.total === 0`
- `src/app/(dashboard)/dashboard/page.tsx`: quick action "Insights" adicionada para owner only
  - Grid `sm:grid-cols-4` (owner) / `sm:grid-cols-3` (outros roles)
  - Corrigidos 3 erros pré-existentes `noArrayIndexKey` no mesmo arquivo

### Concluído (continuação):

**GAP-12 — Integridade completa do CRM (11/06/2026) ✅:**

- `updateAppointmentStatusCore`: guard `shouldUpdateCRM = appointment.status !== "completed" && status === "completed"`
- Antes de incrementar `totalVisits`/`lastVisitAt`, verifica comanda vinculada (`open` ou `closed`): se existe, `fecharComanda` já foi responsável → nenhum incremento
- Zero double-count quando appointment é concluído manualmente após comanda fechada

**GAP-06-E — Conflict check em moveAppointment (11/06/2026) ✅:**

- Criado `moveAppointmentCore` em `src/lib/appointment-core.ts` (linhas 283–353)
  - Guard de status: `completed | cancelled | no_show` → erro imediato
  - Guard idempotente: mesmo `professionalId` → `{ success: true }` sem write
  - Guard de profissional: valida `isActive = true` e `barbershopId` antes de mover
  - Guard legado: `endTime === null` → pula conflict check (appointments sem duração)
  - Conflict check: chama `checkConflict(newProfessionalId, date, endTime, excludeId)` antes do update
- `moveAppointment` em `agenda-actions.ts` refatorado como thin wrapper (–22 linhas)

### Pendente:

**GAP-06-F — Consolidação do wrapper updateAppointmentStatus (11/06/2026) ✅:**

- `dashboard/actions.ts`: wrapper atualizado — `AppointmentStatus` (full enum), `Promise<{ success, error }>`, `revalidatePath` em `/dashboard` + `/dashboard/agenda`
- `agenda-actions.ts`: `updateAppointmentStatus` e `updateAppointmentStatusCore` removidos
- `agenda-board.tsx`: import migrado de `./agenda-actions` para `../actions`
- Callers: `appointment-actions.tsx` (sem alteração), `agenda-board.tsx` (import atualizado)

- GAP-06-G (baixa prioridade): desconto não proporcional em `ComandaItem`

---

## Sprint GAP-UX-02 — Design System Unification (11/06/2026)

### Concluído:

**GAP-UX-02-A — CSS Specificity Fix (11/06/2026) ✅:**

- `dashboard-layout-client.tsx`: removido `color: "var(--text-secondary)"` inline dos NavLinks, ThemeToggle e logout button
- `globals.css`: adicionadas classes `.nav-link { color: var(--text-secondary) }` e `.nav-link:hover { color: var(--text-primary); background-color: rgba(255,255,255,0.04) }`
- Eliminado `!important` em `.nav-link:hover` e `.settings-acessos-link:hover` — ambos agora resolvem por CSS cascade natural
- `settings/page.tsx`: removido `border` inline do card de Acessos (agora em `.settings-acessos-link { border: 1px solid var(--border) }`)
- Tailwind 4 canônico: `group-hover:!text-[...]` → `group-hover:text-(...)!`

**GAP-UX-02-B — CSS Variable Unification (11/06/2026) ✅:**

- `:root` unificado: 11 pares duplicados resolvidos via `var()` bridging
  - `--bg-card`, `--bg-card-elevated`, `--border`, `--text-primary/secondary/tertiary`, `--status-green/yellow/red` agora propagam de `@theme inline`
- `[data-theme="light"]`: 6 linhas removidas (propagam automaticamente via var chains)
- Novos tokens: `--radius-md: 12px`, `--z-overlay: 30`, `--z-header: 40`, `--z-modal: 50`
- `appointment-actions.tsx`: 11 hardcodes (#FF2D55, #00D4A0, #FFB020, #52525B, #A1A1AA, #111111) → tokens CSS
- `dashboard/page.tsx`: 5 hardcodes (#00D4FF, #7C3AED, borderRadius:12) → tokens CSS

**GAP-UX-02-C — Shared Input Component (11/06/2026) ✅:**

- Criado: `src/components/ui/input.tsx` — wrapper com `label`, `error`, `required`; classe `.livo-input` no CSS
- Migrados: `basic-info-form.tsx`, `services-manager.tsx`, `profissionais-client.tsx`, `clients-client.tsx`
- Eliminados: todos os `inputStyle` const e `labelStyle` const nos 4 arquivos
- `useExhaustiveDependencies` corrigido em `services-manager.tsx` (ambos `useEffect` — `onSuccess` adicionado aos deps)
- Biome: zero warnings/errors em 7 arquivos verificados
- TypeScript: `npx tsc --noEmit` clean

### Backlog criado:

**GAP-UX-02-C2 — Input Rollout (pendente):**

Arquivos ainda com `inputStyle` local ou `<input style={{}}>` direto:

- `agenda-board.tsx`
- `nova-comanda-form.tsx`
- `comanda-pdv.tsx`
- `comissoes-client.tsx`
- `produtos-client.tsx`
- `settings/personal-info-form.tsx`
- `settings/vip-form.tsx`

### Próxima fase:

**GAP-UX-02-D — Shared Modal Component (pendente):**

Objetivo: criar `src/components/ui/modal.tsx` e migrar modais existentes.

Escopo:

- Props: `open`, `onClose`, `title`, `description?`, `size?` (`sm`/`md`/`lg`)
- Backdrop: `fixed inset-0 z-[var(--z-modal)] flex items-center justify-center`
- Close: ESC key + click-outside via `e.target === e.currentTarget`
- Scroll: `maxHeight: "90vh"`, `overflowY: "auto"` no dialog
- Candidatos para migração: `clients-client.tsx` (2 modais), `profissionais-client.tsx` (2 modais), futuros modais

---

## Sprint Combos (25/06/2026)

- Combos/Pacotes: CRUD completo, PDV com agrupamento visual, comissão especial
- Migrations: add_combos
- 6 etapas concluídas, deploy em produção

## Sprint Clube de Assinatura — Fases A–G (26/06/2026)

- Fase A: feature flag + schema base + helper clube-flag
- Fase B: actions de gestão + página /dashboard/clube + sidebar
- Fase C: lib asaas-clube + connectClubAccount + webhook /api/webhooks/asaas/clube
- Fase D: OTP por telefone (lib otp-clube + actions + UI login)
- Fase E: área pública de planos + checkout Asaas + área do assinante
- Fase F: clientSubscriptionId no ComandaItem + addPlanServiceToComanda + UI PDV + comissão
- Fase G: /dashboard/clube/assinantes com MRR
- Migrations: add_clube_catalog, add_clube_subscriptions, add_client_verification_codes, add_comanda_item_subscription
- Conformidade BaaS: SeloAsaas + formulário Asaas enviado
- Deploy em produção

## Fix Upload de Foto (26/06/2026)

- Vercel Blob recriado como Public (anterior era Private)
- try/catch adicionado no cliente e na action
- BLOB_READ_WRITE_TOKEN conectado via OIDC

### v2026.06.30 — 2026-06-30

- A1 concluida (validada no preview Vercel): mascaras de telefone BR, moeda
  (estilo caixa registradora) e CPF aplicadas em todo o sistema.
- Novos arquivos: src/lib/masks.ts (reescrito; funcoes puras onlyDigits,
  formatPhoneBR, formatCentsToBRL, parseInputToCents, formatCPF, isValidCPF;
  aliases legados maskPhone/maskCPF/unmask mantidos) e componentes
  src/components/ui/{phone-input,currency-input,cpf-input}.tsx (emitem
  digitos/centavos; hidden input opcional para forms via FormData).
- Telefone -> PhoneInput: booking publico, onboarding, settings (pessoal+
  basico), clients (criar/editar), agenda create-modal, vip, login OTP do clube.
- CPF -> CPFInput (validacao inline + bloqueio do passo 1 do onboarding):
  onboarding (dono), settings pessoal, assinar, clients (criar/editar).
- Preco -> CurrencyInput: produtos, services-manager, combos, clube (preco do
  plano + comissao R$ + desconto R$), comanda-pdv (desconto + split), tv-goals.
- Persistencia (sem schema): updateBasicInfo e vip createLead passam a gravar
  telefone como digitos; parsePriceToCents le inteiro de centavos; exibicao
  publica de telefone via formatPhoneBR (idempotente, cobre legado).
- Sem schema/migration. Sem constraint de CPF (fica para B4). Engine de comissao
  intacta (item.totalInCents). Convencao \*InCents preservada. tsc=0; build OK.
- Pendencia conhecida: telefone legado da barbearia / whatsapp do vip ainda
  gravados formatados; exibicao ja normalizada. Se um dia normalizar os dados,
  NAO tocar nos 14 WaitlistLead.

### v2026.06.30 — 2026-06-30 (A2.2)

- A2.2 concluida e validada no preview/producao: corrigido OAuthAccountNotLinked.
- src/auth.ts: adicionada allowDangerousEmailAccountLinking: true APENAS no
  provider Google (Google verifica o e-mail; risco de takeover nulo). NAO
  habilitar em outros providers. Comentario em PT no codigo.
- Resultado: conta de credenciais existente entra com "Entrar com Google" do
  mesmo e-mail e VINCULA na conta existente (mesma conta, mesmas configuracoes),
  sem criar conta nova. Validado com vortexsage7 (login Google entrou normal).
- Callbacks jwt/session, Credentials, roteamento, schema: NAO tocados. tsc=0;
  build OK.
- CORRECAO DE FATO: o projeto roda Next.js 16 (nao 14). Build mostra 38 rotas e
  aviso de middleware->proxy (deprecado, nao quebrado). Atualizar string "14"
  para "16" nos docs.
- Pendencias anotadas para A2.3: (i) loop de redirect /dashboard -> /login para
  user Google novo sem membership; (ii) P2025 no onboarding para sessao zumbi;
  (iii) limpeza token.id vs token.sub no callback jwt.
