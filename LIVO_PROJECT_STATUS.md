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

### v2026.06.30 — 2026-06-30 (A2.3 + fecha A2)

- A2.3 concluida e validada em producao: corrigida a causa 2 do bug de login
  (roteamento + sessao-zumbi). Bug de login encerrado por completo (A2 inteira).
- src/lib/permissions.ts (requireMembership): passa a distinguir dois casos
  antes tratados como o mesmo redirect /login: sem sessao -> /login; logado SEM
  membership -> /onboarding. Elimina o loop /dashboard <-> /login. Roda em Node
  (le o banco), nunca no Edge. Confirmado que /onboarding nao chama
  requireMembership (sem auto-loop) e que o middleware autoriza logado em
  /onboarding (sem recriar loop).
- src/app/(onboarding)/onboarding/actions.ts: import de Prisma e signOut; o
  tx.user.update agora trata P2025 (user de sessao inexistente) com
  signOut({ redirectTo: "/login" }) -> logout limpo em vez de crash no error
  boundary. signOut lanca NEXT_REDIRECT que propaga (sem catch ao redor). catch
  generico preservado para erros nao-P2025.
- Validacao em producao: conta orfa (contatodegani) -> caiu em /onboarding e
  completou o cadastro virando barbearia (fluxo completo OK); conta com
  barbearia (Barbearia Degas, via Google) -> entrou direto no dashboard, sem
  efeito colateral.
- NAO tocados: middleware (nao editado, nao renomeado para proxy), callbacks
  jwt/session (seguem sem Prisma), provider Google/Credentials, schema/migration.
- Contas orfas restantes: vitoriasantos.def e cassarofernando240 (eram 3;
  contatodegani concluiu o onboarding). Resolvem-se ao logar; nada deletado.
- Parte 2 (P2025) validada por revisao de codigo, nao por teste: reproduzir
  exige apagar user com sessao aberta. Pior caso degrada para o comportamento
  antigo (tela de erro), sem risco de regressao.
- Itens de housekeeping pendentes (separados de proposito): limpeza token.id vs
  token.sub no callback jwt; migracao middleware -> proxy (Next 16). Build tambem
  sinalizou update disponivel Prisma 5 -> 7.

### v2026.06.30 — 2026-06-30 (A2.4 + fecha trilha A2 completa)

- A2.4 concluida e validada em producao: higiene de callback. token.id (campo
  orfao, so escrito nunca lido) eliminado; jwt passa a gravar em token.sub, o
  mesmo campo que o callback session ja lia. Escrita e leitura agora no campo
  padrao unico. Varredura confirmou que nenhum arquivo lia token.id e que
  next-auth.d.ts nao declarava token.id (nada mais a remover).
- src/auth.ts (callback jwt): token.id = user.id -> token.sub = user.id.
  Callback session inalterado (ja lia token.sub). Sem Prisma adicionado
  (edge-safe mantido).
- Validado em producao: login por credenciais e login Google entram normais,
  com session.user.id resolvendo identidade/role corretas.
- NAO tocados: middleware, provider Google/Credentials, requireMembership/
  roteamento, schema/migration, TX, 14 WaitlistLead. tsc=0; build OK.

--- TRILHA A2 (bug de login) ENCERRADA ---

- A2.1: diagnose read-only (2 causas confirmadas em codigo + dados reais no Neon).
- A2.2: allowDangerousEmailAccountLinking no Google -> corrige OAuthAccountNotLinked.
- A2.3: requireMembership distingue sem-sessao (/login) de logado-sem-membership
  (/onboarding), elimina loop; P2025 no onboarding -> signOut limpo.
- A2.4: higiene token.sub.
- Pendencias de housekeeping (nao-bloqueantes, separadas de proposito):
  middleware -> proxy (Next 16); update Prisma 5 -> 7. Adiadas ate haver folego.
- Correcao de fato registrada: projeto roda Next.js 16 (nao 14).

### v2026.07.01 — 2026-07-01 (Incidente de onboarding — RESOLVIDO)

- INCIDENTE EM PRODUCAO detectado via Sentry (usuarios reais bloqueados de
  concluir onboarding): erro "CPF ja cadastrado no sistema." e falhas
  correlatas de slug/ownerId caiam no error boundary generico ("Algo deu
  errado"), sem mensagem amigavel. Causa raiz: Next.js redige mensagens de
  erros LANCADOS (throw) por Server Actions em producao; apenas valores
  RETORNADOS preservam a mensagem no cliente.
- src/app/(onboarding)/onboarding/actions.ts: pre-checagens de campos/
  endereco/slug/cpf convertidas de throw Error para return { error }, lidas
  pelo estado de erro ja existente em page.tsx (reuso do mecanismo, sem novo
  contrato de UI).
- NOVA pre-checagem de Barbershop.ownerId (@unique) ANTES da transacao:
  usuario que ja possui barbearia e reenvia onboarding -> redirect("/dashboard")
  (estado valido, nao erro). Elimina P2002 nao tratado em ownerId.
- catch: tratamento de P2002 (rede de seguranca para corrida entre pre-check e
  INSERT) via err.meta.target, mapeando ownerId/cpf/slug para redirect ou
  mensagem amigavel. P2025/signOut (A2.3) mantido INTACTO, nao tocado.
  Catch-all preservado para erros verdadeiramente inesperados.
- error.tsx: mensagem levemente mais util (orientacao de suporte via
  contato@livobarber.com.br) mantendo error.message oculto (sem vazar
  detalhes tecnicos/coluna de banco).
- Validado em producao (Sentry + teste real): mensagem "Este CPF ja esta
  cadastrado em outra conta. Faca login ou entre em contato com o suporte."
  exibida inline, sem crash. tsc=0; build OK.
- NAO alterado: schema/migration (constraint de cpf @unique ja existia antes
  deste incidente), middleware, callbacks jwt/session, providers, TX Barbearia,
  14 WaitlistLead.
- Nota para backlog (nao urgente): Sentry revelou outros erros de validacao
  com o mesmo padrao de "throw cru -> tela generica" (ex.: "Preco do combo
  deve ser maior que zero", erro de Vercel Blob em upload de foto de
  profissional). Mesma familia de problema; candidatos a correcao futura,
  fora do escopo deste incidente.

### v2026.07.01 — 2026-07-01 (Incidente de onboarding — RESOLVIDO por completo)

- INCIDENTE PARTE 1 (ja registrado): erros de CPF/slug/ownerId no submit final
  do onboarding causavam crash generico ("Algo deu errado") em vez de mensagem
  amigavel. Corrigido via return { error } em vez de throw (Next.js redige
  mensagens de erros lancados por Server Actions em producao). Validado com
  Sentry + teste real.
- INCIDENTE PARTE 2 (UX): usuario so descobria CPF duplicado no FIM do Passo 2,
  apos preencher endereco inteiro -- desperdicio de tempo e confusao.
- src/lib/cpf.ts (novo): CPF_TAKEN_MESSAGE centralizada + checkCpfAvailable(cpf,
  currentUserId?) -- funcao pura reutilizavel, mesma query/normalizacao de
  antes, exclui a propria conta do usuario da checagem.
- onboarding/actions.ts: nova Server Action validateCpfStepAction(cpf); a
  checagem final (rede de seguranca contra concorrencia) refatorada para
  reusar checkCpfAvailable, SEM mudanca de comportamento.
- onboarding/page.tsx: botao "Próximo" do Passo 1 agora chama
  validateCpfStepAction ANTES de avancar de step; bloqueia com mensagem
  inline se CPF duplicado; estado de loading ("Verificando...") evita
  duplo-clique.
- Validado em producao: CPF duplicado bloqueia no Passo 1 (nao chega mais no
  endereco); CPF novo segue fluxo normal; rede de seguranca do Passo 2 intacta.
- NAO alterado: e-mails de boas-vindas/confirmacao no cadastro (continuam
  disparando antes do CPF ser conhecido -- limitacao estrutural aceita,
  documentada e explicada ao Edu); slug/ownerId/P2025/signOut/middleware/
  callbacks/schema; TX Barbearia; 14 WaitlistLead. tsc=0; build OK.
- Nota de backlog (nao urgente): mesmo padrao "throw cru -> tela generica"
  ainda existe em outros pontos do sistema (Sentry apontou: combos com preco
  zero, upload de foto/Vercel Blob). Candidatos a correcao futura fora deste
  incidente.

### v2026.07.01 — 2026-07-01 (Incidente de onboarding — RESOLVIDO por completo)

- INCIDENTE PARTE 1: erros de CPF/slug/ownerId no submit final do onboarding
  causavam crash generico ("Algo deu errado") em vez de mensagem amigavel.
  Corrigido via return { error } em vez de throw (Next.js redige mensagens de
  erros lancados por Server Actions em producao). Validado com Sentry + teste
  real.
- INCIDENTE PARTE 2 (UX): usuario so descobria CPF duplicado no FIM do Passo 2,
  apos preencher endereco inteiro -- desperdicio de tempo e confusao.
- src/lib/cpf.ts (novo): CPF_TAKEN_MESSAGE centralizada + checkCpfAvailable(cpf,
  currentUserId?) -- funcao pura reutilizavel, mesma query/normalizacao de
  antes, exclui a propria conta do usuario da checagem.
- onboarding/actions.ts: nova Server Action validateCpfStepAction(cpf); a
  checagem final (rede de seguranca contra concorrencia) refatorada para
  reusar checkCpfAvailable, SEM mudanca de comportamento.
- onboarding/page.tsx: botao "Próximo" do Passo 1 agora chama
  validateCpfStepAction ANTES de avancar de step; bloqueia com mensagem
  inline se CPF duplicado; estado de loading ("Verificando...") evita
  duplo-clique.
- Validado em producao (print real): CPF duplicado bloqueia no Passo 1,
  mensagem "Este CPF já está cadastrado em outra conta. Faça login ou entre
  em contato com o suporte." exibida corretamente, sem chegar ao endereco.
- NAO alterado: e-mails de boas-vindas/confirmacao no cadastro (continuam
  disparando antes do CPF ser conhecido -- limitacao estrutural aceita e
  documentada); slug/ownerId/P2025/signOut/middleware/callbacks/schema;
  TX Barbearia; 14 WaitlistLead. tsc=0; build OK.
- Nota de backlog (nao urgente): mesmo padrao "throw cru -> tela generica"
  ainda existe em outros pontos (Sentry apontou: combos com preco zero,
  upload de foto/Vercel Blob). Candidatos a correcao futura, fora deste
  incidente.

### v2026.07.01 — 2026-07-01 (Fase B1 — ENCERRADA)

- B1.3 concluida e validada: portao suave ativo. Dono com emailVerified = null
  continua com dashboard/agenda/comandas funcionando normal, mas fica bloqueado
  em 2 pontos: pagina publica ([slug] + /book + /clube, tela neutra
  PublicUnavailable, sem expor motivo a visitantes) e inicio de cobranca
  (assinar/actions.ts, mensagem clara pedindo confirmacao via /verify-email).
  Login Google conta como ja confirmado (populado pela B1.2). isActive
  permanece semanticamente intacto -- gate e checagem separada.
- src/lib/email-gate.ts (novo): isEmailGateBlocked() com isenção estrutural
  para planStatus === lifetime -- protege a TX por REGRA, nao por excecao
  hardcoded.
- BACKFILL DE DADOS (unico, pontual, executado no Neon): emailVerified = now()
  para 6 contas de donos de barbearia criadas ANTES da B1.2 (trial/active/
  suspended/lifetime), identificadas por discriminador estrutural (ausencia de
  email_verification_tokens, nao por corte de timestamp). TX excluida por
  dupla via (seatLimitOverride <> -1 explicito + isencao lifetime). 14
  WaitlistLead nao tocados. SELECT de confirmacao revisado pelo Edu ANTES do
  UPDATE; resultado pos-UPDATE confirmado vazio (No result) -- as 6 contas
  nao aparecem mais como pendentes.
  Contas cobertas: contatodegani, vortexsage7, pedrohs2520, cassarofernando2,
  carloscabelereiro43, dieguin112k24 -- todas trial, criadas entre 08/06 e
  24/06/2026, anteriores ao fluxo de confirmacao (deploy B1.2 em 01/07).
  Cadastros a partir de agora passam pelo fluxo normal de confirmacao.

--- FASE B1 (confirmacao de e-mail) ENCERRADA ---

- B1.1: diagnose read-only (padrao de token, pontos de gate, Google ja
  verificado).
- B1.2: fundacao -- EmailVerificationToken, /verify-email (Node), e-mail via
  Resend, disparo no cadastro, events.createUser para Google. Sem gate ativo.
- Incidente correlato (mesma janela): erros de CPF/slug/ownerId no onboarding
  causavam crash generico -- corrigido (return em vez de throw) + checagem
  antecipada de CPF no Passo 1. Resolvido e validado com Sentry + producao.
- B1.3: portao suave ativo (pagina publica + cobranca).
- Backfill: contas pre-B1.2 protegidas retroativamente.
- NAO tocados em toda a fase: middleware, callbacks jwt/session, providers,
  CPF/CNPJ do Asaas (VS-4), TX Barbearia, 14 WaitlistLead. tsc=0 e build OK
  validados em cada etapa.

### Nota de pendencia — Ativacao dos e-mails institucionais (adiada de proposito)

- Os documentos legais (Termos, Politica de Privacidade, Termo de Tratamento de
  Dados) ja referenciam privacidade@livobarber.com.br (Encarregado/DPO) e
  contato@livobarber.com.br (contato geral) como os enderecos oficiais.
- Esses enderecos AINDA NAO recebem e-mail de verdade -- a ativacao via
  ImprovMX (encaminhamento gratuito para o Gmail do Edu, sem tocar nos
  registros DNS existentes de Vercel/Resend) foi DELIBERADAMENTE ADIADA para
  o final do processo, por decisao do Edu.
- Isso NAO bloqueia B2 (aceite de Termos) nem a publicacao dos documentos --
  os enderecos ja estao corretos nos textos. So precisam estar ativos e
  monitorados antes de os documentos irem ao ar / receberem o primeiro pedido
  real de titular de dados.
- Retomar: criar conta no ImprovMX -> criar os 2 aliases (privacidade@,
  contato@) apontando para o Gmail do Edu -> adicionar os 2 registros MX (e
  o TXT SPF, se pedido) no Registro.br via "Nova Entrada" na Configurar Zona
  DNS -- SEM tocar nas entradas existentes (A da Vercel, TXT DKIM/SPF do
  Resend, MX send.livobarber.com.br do Resend, CNAME www).

### v2026.07.01 — 2026-07-01 (B2.2 — Fundação do aceite de Termos)

- Model novo TermsAcceptance (append-only, migration aditiva): userId,
  documentType, version, acceptedAt, ipAddress, userAgent. @@map
  terms_acceptances. migrate diff sem DROP (so CREATE TABLE + ADD CONSTRAINT
  de FK nova).
- src/lib/terms.ts (puro, sem Prisma/headers): CURRENT_TERMS_VERSION =
  "2026-07-01" + isTermsPending(acceptedVersion, currentVersion) -- mesmo
  padrao arquitetural do email-gate.ts (B1.3). Documentado que a versao sera
  incrementada quando o advogado aprovar o texto final, disparando re-aceite
  automatico de todos os usuarios.
- src/lib/terms-record.ts (Node): recordTermsAcceptance(userId) captura
  ipAddress/user-agent via headers() e grava via db.termsAcceptance.create.
  Reusada pelo cadastro e pelo interstitial, sem duplicar logica.
- Cadastro por credenciais: checkbox desmarcado por padrao ("Li e aceito os
  Termos de Uso e a Política de Privacidade", com links). Validacao
  return { error } (nao throw) bloqueia cadastro sem marcar. Ao criar a conta,
  grava TermsAcceptance (documentType = "bundle").
- Nova rota /aceitar-termos (Node, runtime nodejs): interstitial standalone,
  exige login, exibe versao vigente, grava aceite ao confirmar, redireciona
  para /dashboard.
- Decisao de modelagem: documentType = "bundle" unico (nao terms+privacy
  separados) -- um so checkbox no produto, isTermsPending fica uma unica
  comparacao de versao, sem estados de aceite parcial.
- Validado em producao (4/4 cenarios, com prints e query real no Neon):
  (1) cadastro sem marcar -> bloqueado com mensagem clara; (2) cadastro
  marcando -> conta criada + linha real gravada em terms_acceptances
  (confirmado via SELECT no Neon); (3) /aceitar-termos acessivel isoladamente,
  carrega e exibe versao corretamente; (4) dashboard/onboarding seguem 100%
  acessiveis sem aceite (nenhum gate ativo ainda).
- NAO tocado: middleware, callbacks jwt/session, providers, B1.2/B1.3
  (email-verification/email-gate, so lidos como referencia), onboarding/
  actions.ts, src/lib/cpf.ts, TX Barbearia, 14 WaitlistLead. tsc=0; build OK.
- Pendente: B2.3 (ligar o gate real -- bloquear dashboard/onboarding para
  quem nao aceitou, com /aceitar-termos e paginas legais isentas, sem
  recriar o loop que a A2.3 corrigiu).

### v2026.07.01 — 2026-07-01 (B4 — CPF único, FASE B ENCERRADA)

- B4 concluida e validada em producao: CPF unico agora protegido nos DOIS
  pontos que escrevem User.cpf.
- settings/actions.ts (updatePersonalInfo): pre-checagem checkCpfAvailable
  (cpf, membership.userId) antes do update -> CPF_TAKEN_MESSAGE se
  indisponivel. Exclusao do proprio owner via currentUserId (evita falso
  positivo ao salvar sem mudar o CPF). Rede de seguranca no catch para
  P2002 com meta.target incluindo "cpf". Reuso direto de src/lib/cpf.ts
  (checkCpfAvailable, CPF_TAKEN_MESSAGE) -- sem duplicar logica, sem
  migration (User.cpf @unique ja existia).
- Anomalia investigada e resolvida: primeiro teste mostrou mensagem
  generica ("Erro ao salvar dados pessoais") em vez da amigavel. Causa
  raiz confirmada por diagnose + git status: commit da B4.2 nao tinha sido
  publicado (working tree com settings/actions.ts modified, sem push) --
  Vercel servia a versao pre-B4.2. Apos git push, comportamento correto
  confirmado em producao com print real.
- NAO alterado: onboarding/actions.ts (ja protegido), src/lib/cpf.ts (so
  importado), middleware, callbacks, providers, B1/B2 (email-gate/
  terms-gate). TX Barbearia e 14 WaitlistLead intocados. tsc=0; build OK.

--- FASE B (seguranca e conformidade) ENCERRADA ---

- B1: confirmacao de e-mail (fundacao + portao suave + backfill de contas
  pre-existentes).
- Incidente correlato: erros de onboarding (CPF/slug/ownerId) viram
  mensagem amigavel; checagem de CPF antecipada no Passo 1.
- B2: aceite de Termos + Politica, log versionado append-only (
  TermsAcceptance), gate ativo no dashboard e onboarding, TX isenta
  estruturalmente (planStatus = lifetime).
- B4: CPF unico nos dois pontos de escrita (onboarding + settings).
- Pendencias registradas (nao bloqueantes): confirmacao do teste da TX no
  gate de termos (aguardando retorno do Taxinha); ativacao do ImprovMX para
  privacidade@/contato@livobarber.com.br (adiada de proposito para o fim).

### v2026.07.02 — 2026-07-02 (C1 — Fase C: hardening Asaas, item 1/4)

- P1-A + VS-5 RESOLVIDOS: webhook Asaas principal protegido contra eventos
  fora de ordem. Barbershop ganhou lastBillingEventAt (DateTime?, migration
  aditiva 20260702160955_add_last_billing_event_at_barbershop, so ADD COLUMN).
- src/app/api/webhooks/asaas/route.ts: eventAt extraido de body.dateCreated
  (campo raiz do payload, presente em TODOS os 7 tipos de evento -- inclusive
  SUBSCRIPTION_DELETED, que nao tem objeto payment). Deliberadamente NAO usa
  o fallback do clube (confirmedDate ?? dueDate ?? now()), que colapsaria
  para now() nesse evento e quebraria a ordenacao no caso mais perigoso.
- Guarda simetrica aplicada aos 6 updateMany que escrevem planStatus (OR:
  lastBillingEventAt null OU menor que o evento atual) -- protege tanto
  downgrade (suspended/cancelled) quanto upgrade (active): um CONFIRMED
  atrasado nao reativa conta ja legitimamente suspensa/cancelada por evento
  mais recente.
- Protecao planStatus=lifetime intacta nos 6 updates (TX imune). Sempre-200
  preservado (evento fora de ordem = 0 linhas, nao e erro). Handler do clube
  nao tocado (padrao proprio, ja correto). tsc=0; build OK.
- Pendente: validacao manual em producao via POST simulado (roteiro no
  relatorio da execucao) -- ainda nao confirmada pelo Edu.
- Proximo: C2 -- P1-B (asaasSubscriptionId @unique + guard de double-submit
  na criacao de assinatura).

### v2026.07.02 — 2026-07-02 (C1 — VALIDADO em producao)

- P1-A + VS-5 confirmados corrigidos com teste real de ponta a ponta (3
  eventos simulados via POST direto ao webhook, com header de autenticacao
  real): evento OVERDUE recente suspende; evento CONFIRMED mais ANTIGO que o
  ja processado e corretamente IGNORADO (lastBillingEventAt nao regride);
  evento CONFIRMED mais recente reativa normalmente.
- Nota do processo: a primeira rodada de testes foi feita contra codigo NAO
  publicado (git push pendente), o que mascarou o comportamento correto por
  alguns ciclos -- corrigido publicando o commit pendente antes de retestar.
  Licao reforcada: sempre confirmar deploy "Ready" antes de validar qualquer
  correcao.
- Conta de teste "vortex" resetada ao estado trial/limpo apos os testes.

### v2026.07.02 — 2026-07-02 (C1 + C2 — Fase C, itens 1 e 2 CONCLUIDOS)

--- C1: P1-A + VS-5 (webhook Asaas fora de ordem) — RESOLVIDO E VALIDADO ---

- Barbershop ganhou lastBillingEventAt (DateTime?, migration aditiva). Guarda
  simetrica nos 6 updateMany do webhook: eventAt extraido de body.dateCreated
  (campo raiz, unico presente em TODOS os 7 tipos de evento, inclusive
  SUBSCRIPTION_DELETED que nao tem objeto payment). Evento mais antigo que o
  ja processado e silenciosamente ignorado (sempre-200 preservado); protege
  tanto downgrade (suspended/cancelled) quanto upgrade (active).
- VALIDADO EM PRODUCAO com 3 POSTs reais simulando o Asaas (conta de teste
  "vortex", resetada ao final): evento antigo corretamente ignorado
  (planStatus e lastBillingEventAt inalterados); evento novo aplicado
  normalmente. Primeira rodada de testes mascarada por deploy pendente —
  licao reforcada: sempre confirmar "Ready" na Vercel antes de validar.

--- C2: P1-B (asaasSubscriptionId sem @unique + race condition) — RESOLVIDO ---

- assinar/actions.ts: update incondicional trocado por compare-and-swap (CAS)
  contra o valor de asaasSubscriptionId LIDO no inicio da funcao (nao contra
  null fixo) -- cobre tanto trial (null) quanto re-assinatura de barbearia
  cancelled (ID stale). Double-submit: o request perdedor cancela a propria
  subscription orfa no Asaas via cancelAsaasSubscription (@/lib/asaas, DELETE
  /subscriptions/{id}) e retorna erro amigavel (return, nao throw).
- Barbershop.asaasSubscriptionId ganhou @unique (migration aditiva, so
  CREATE UNIQUE INDEX). Pre-check obrigatorio no Neon confirmou ausencia de
  duplicatas antes de aplicar; a propria aplicacao sem erro e segunda prova.
- Gates de planStatus (active/lifetime/suspended), webhook C1, clube e
  asaas-clube nao tocados. tsc=0; build OK em ambas as etapas.

--- Fase C: 2/4 concluidos. Restam C3 (advisory lock em edicao/movimentacao
de agendamento) e C4 (rate limit na pagina publica de agendamento). ---

### v2026.07.02 — 2026-07-02 (C1+C2 — testes reparados, 100% verde no escopo)

- Os 16 testes pre-existentes quebrados por C1 (webhook ordering) e C2 (CAS
  subscription) foram corrigidos -- SOMENTE arquivos de teste, nenhum codigo
  de producao tocado. Causa: 11 eram gap de mock (updateMany/
  cancelAsaasSubscription ausentes dos mocks de C2); 5 eram staleness de
  asserção exata (data ganhou lastBillingEventAt no C1).
- Reforco de regressao: asserções trocadas de match exato para
  objectContaining + validacao explicita do guard novo (where com OR de
  lastBillingEventAt, CAS com asaasSubscriptionId lido) -- preserva a
  intencao original dos testes em vez de so afrouxar.
- Teste NOVO adicionado: "reactivates when dateCreated is strictly later, no
  tie (ordering guard)" -- trava o comportamento de reativacao ordenada com
  timestamps sem empate.
- Resultado: 4 arquivos alvo 100% verdes (90/90). Suite completa: 47 falhas
  remanescentes (de 63), todas pre-existentes e fora de escopo (agenda
  read-side, onboarding, avatar-upload, rbac, convite) -- nenhuma falha nova
  introduzida. tsc=0; build OK.
- RISCO REGISTRADO (nao corrigido, follow-up do C1): guard `lt` pode
  descartar evento por empate de dateCreated (resolucao de segundos do
  Asaas ou fallback now()) quando dois eventos de STATUS DIFERENTE colidem
  no mesmo timestamp. NAO trocar lt->lte as cegas (reabriria o bug
  original). Requer decisao de politica de desempate (ex.: id/sequencia do
  evento como criterio secundario). Baixa probabilidade em producao real
  (pares OVERDUE->CONFIRMED tipicamente distantes em dias).
- Debito de teste remanescente (fora de escopo, anterior a Fase C): 47
  falhas em agenda read-side, onboarding, avatar-upload, rbac, convite --
  registrado, nao urgente.

### v2026.07.02 — 2026-07-02 (FASE C ENCERRADA — hardening Asaas + agenda + booking)

--- C1: P1-A + VS-5 (webhook Asaas fora de ordem) ---

- Barbershop ganhou lastBillingEventAt. Guarda simetrica (upgrade+downgrade)
  nos 6 updateMany, usando dateCreated (campo raiz do payload, unico
  presente em todos os 7 eventos). Validado com 3 POSTs reais em producao.

--- C2: P1-B (asaasSubscriptionId sem @unique + race na assinatura) ---

- CAS contra o valor lido (cobre trial e re-assinatura de cancelled) +
  cancelamento automatico de subscription orfa no Asaas em conflito.
  @unique aplicado apos confirmar ausencia de duplicatas.

--- C3: VS-2 (updateAppointmentCore/moveAppointmentCore sem advisory lock) ---

- Re-check autoritativo (appointment + timeBlock) dentro do lock ja
  existente em move; lock + re-check adicionados em update. Validado por
  suite automatizada (37/37 nos arquivos alvo).

--- C4: P1-C/N-03 (rate limit + validacao na pagina publica) ---

- Descoberto que createAppointment JA TINHA rate limit (10/hora/IP) de
  sessao anterior nao documentada -- auditoria estava desatualizada.
- Adicionado: validacao de telefone (isValidPhoneBR, 10/11 digitos,
  rejeita "1"); bypass fail-open de IP "unknown" fechado (balde
  compartilhado); rate limit proprio e folgado em getAvailableSlots
  (120/hora/IP, nao compartilha contador com createAppointment).

--- Reparo de debito colateral (C1+C2) ---

- 16 testes pre-existentes desatualizados por C1/C2 corrigidos +1 teste novo
  de regressao para o guard de ordering. Suite: 63->47 falhas (as 47
  remanescentes sao debito anterior a Fase C, fora de escopo).

--- Validacao completa da fase ---

- npx vitest run: 47 failed | 765 passed | 812 (baseline estavel, sem
  regressao). tsc=0 e build OK em todas as etapas. TX Barbearia e 14
  WaitlistLead intocados em toda a fase.

--- Pendencias registradas (nao bloqueiam, follow-up futuro) ---

- Politica de desempate de timestamp no guard do C1 (risco de baixa
  probabilidade, empate de dateCreated entre eventos de status diferente).
- Helper compartilhado de rate-limit (6 implementacoes isoladas hoje) --
  melhoria de manutenibilidade, nao urgente.
- 47 falhas de teste pre-existentes (agenda read-side, onboarding,
  avatar-upload, rbac, convite) -- debito anterior a Fase C.
- Confirmacao da TX (login real do Taxinha) na B2.3 -- ainda pendente.
- Ativacao do ImprovMX (privacidade@/contato@) -- guardada para o final,
  por decisao do Edu.

### v2026.07.02 — 2026-07-02 (Grupo A+B — upload de imagem + bloqueio touch)

- Limite de upload de avatar: corrigido de 1MB EFETIVO (nao documentado,
  default do Next.js) para 10MB real. next.config.ts ganhou
  experimental.serverActions.bodySizeLimit: "10mb"; MAX_AVATAR_BYTES 5MB->10MB.
- Compressao client-side adicionada (compressImageFile): reduz para max
  800px no maior lado, JPEG q0.8, com fallback seguro (usa original se
  compressao falhar ou nao reduzir o tamanho). Resolve fotos de 50MP sem
  depender so do limite maior.
- Confirmado e resolvido separadamente: erro "private access" do Sentry era
  de configuracao pontual do Blob Store (26/06), ja corrigido -- Store
  publico confirmado, upload funcionando em producao sem erro.
- Bloqueio de horario: adicionado botao explicito "Bloquear este horário" no
  modal de criar agendamento (visao Dia), reusando a mesma
  handleTimeBlockCreate do arrasto -- funciona com toque simples, sem
  depender do gesto de arrasto (mouse-only, quebrado em touchscreen).
  Arrasto no desktop continua intacto, sem alteracao.
- Fora de escopo, registrado para fase futura: migrar o gesto de arrasto
  para Pointer Events (permitiria tambem arrastar duracao no touch).
- Suite: 47 failed | 765 passed (baseline estavel; teste de limite
  atualizado para 10MB, 1 falha pre-existente de texto isolada e nao
  relacionada). tsc=0; build OK nas duas tarefas.

### v2026.07.02 — 2026-07-02 (Grupo C — 1/2: busca de serviço + fotos publicas)

- ServiceChips (compartilhado por CreateModal e EditModal) ganhou busca
  client-side em memoria, exibida so quando ha mais de 6 servicos (sem
  ruido em barbearias pequenas). Sem rede, sem debounce.
- Landing publica ([slug]/page.tsx): nova secao "Nossa equipe" exibindo
  avatarUrl (ou iniciais) de cada profissional ativo -- reuso puro do dado
  ja existente, sem migration.
- Booking com 1 unico profissional: avatar do profissional agora aparece no
  passo de data/hora (antes ficava oculto, exibido so com 2+ profissionais).
- Nenhum schema/migration; upload de avatar intocado, so exibicao ampliada.
- Suite: 47 failed | 765 passed (baseline estavel). tsc=0; build OK.
- Pendente (Item 2B, fase separada com migration): foto de capa da
  barbearia -- exige campo novo (coverPhotoUrl) + extrair helper de upload
  compartilhado (compressImageFile/MAX_BYTES hoje sao locais a
  profissionais/actions.ts, precisam virar src/lib/image-compress.ts +
  src/lib/blob-upload.ts antes, para nao duplicar logica).

### v2026.07.02 — 2026-07-02 (Grupo C — 1/2 e refatoracao de upload)

- Busca de servico + fotos publicas: ver changelog anterior desta mesma
  data (ServiceChips com filtro >6 servicos; secao "Nossa equipe" na
  landing; avatar exibido no booking com 1 profissional).
- REFATORACAO (sem mudanca de comportamento): compressImageFile extraida
  para src/lib/image-compress.ts (client, exportada, generica). Upload
  extraido para src/lib/blob-upload.ts (server, uploadImageToBlob
  parametrizado por pathPrefix/maxBytes/allowedTypes). actions.ts e
  profissionais-client.tsx passam a consumir os helpers em vez de logica
  duplicada. Mesmos valores (10MB, jpeg/png/webp, access:public), mesmas
  mensagens de erro. Unica mudanca de ordem interna: del da foto antiga
  agora ocorre APOS o upload novo confirmar (mais seguro -- falha no
  upload preserva a foto antiga em vez de apagar).
- Suite: 47 failed | 765 passed (baseline estavel, zero regressao nova).
  tsc=0; build OK.
- Helpers prontos para reuso no proximo passo (Item 2B): foto de capa da
  barbearia.

### Rodapé global S.A.L.A + limpeza do hero público — 2026-07-03

- Novo <PublicFooter/> ("Product by S.A.L.A Tecnologia © 2026"), client component
  com gate por usePathname, inserido 1x no layout raiz. Aparece em público/auth/
  legal/onboarding; oculto em /dashboard, /tv e / (home). Nenhuma rota movida.
- [slug]/page.tsx: removida a marca-dagua "livo" do topo e o footer antigo
  "Agendamento online por Livo" (substituido pelo rodape global). Capa 200->240px;
  overlap do logo -48->-32px.
- [slug]/book/page.tsx: removida a marca-dagua "livo".
- Confirmado: paginas estaticas (/vip, /tv) permaneceram estaticas (client
  footer no root nao causou deopt de renderizacao).
- Sem alteracao em coverPhotoUrl/logoUrl/upload nem no footer de marketing da home.
  tsc=0, next build=0. Commit 96804d2 em main; push OK.
- STATUS: validacao visual final em producao pendente de confirmacao do Edu
  (print das rotas com/sem rodape, e se overlap/altura da capa ficaram bons).

### Escala de fundo carvão + páginas públicas dark-locked — 2026-07-03

- Escala dark trocada de preto puro para carvão: --color-background
  #050505->#191919; surfaces 1..4 -> #212121/#262626/#303030/#3a3a3a. Os
  bridges :root que eram hex fixo (--bg-base/sidebar/input/text-inverse)
  agora apontam via var(). Contraste: --color-text-tertiary #52525b->#83838d
  (~4.6:1, corrigido de #6b6b76 sugerido apos medicao reprovar AA),
  --color-border 0.06->0.09. Novo bloco [data-theme="dark"] reafirma a
  escala dark em subarvores.
- 19 telas publicas/auth/legal/onboarding: hardcode #050505/#0A0A0A -> var(),
  e data-theme="dark" explicito no root de cada uma (dark-locked -- nunca
  herdam o tema claro do dashboard). Inclui a borda do recorte do logo em
  [slug] e o PublicFooter.
- 2 residuos hardcoded do dashboard (client-list, acessos-client) -> var()
  (tema normal, sem dark-lock).
- Tema claro, home/landing, TV e notification-bell inalterados. tsc=0,
  next build=0. Commit 26faa11 em main; push OK.
- STATUS: validacao visual + teste de dark-lock em producao pendente de
  confirmacao do Edu.

  ### E3 — Gate real de modulos PRO-only LIGADO — 2026-07-03

- src/lib/modules.ts: +accessibleModulesFor (puro) e +getAccessibleModules
  (1 query) -- hasModuleAccess/requireModuleAccess originais intocados.
- Nav: layout.tsx alargou o findUnique existente (+plan/planStatus/
  moduleAddOns, zero query extra); allowedModules passado como prop.
  dashboard-layout-client.tsx: NavItem.module?, LockedNavItem (cadeado
  "PRO", mesmo padrao visual do Clube); LiviaBubble so renderiza com
  acesso ao modulo "livia".
- Paginas navegaveis (comissoes/marketing/insights/profissionais):
  hasModuleAccess + redirect("/dashboard/assinar") -- profissionais ganhou
  guard no topo da page (antes so na action, divergencia corrigida).
- Endpoints de escrita: requireModuleAccess (throw, padrao clube) em
  updateProfessionalItemCommissions, dismissInsight, as 6 escritas de
  profissionais, os 4 writes de TV + updateMembershipComissao em settings.
  NAO gateado: recalcularComissoesPendentes (dependencia cruzada com
  settings, indevido gatear a funcao compartilhada).
- Settings: secao Ranking TV vira placeholder "Disponível no plano PRO"
  quando sem "tv"; resto de Settings intacto. Desvio reportado: nao existe
  sub-secao de comissao em Settings para condicionar -- gatear a action
  (feito) e suficiente.
- api/livia/route.ts: 403 apos getCurrentMembership. tv/api/pair e
  tv/api/data: 403 defensivo apos resolver barbershopId (sem requireRole,
  rotas sem sessao).
- Convencao de erro de cada arquivo (throw vs return{error}) respeitada,
  nao forcada -- confirmado por arquivo.
- 48 testes quebrados pela ligacao do gate corrigidos via vi.mock("@/lib/modules")
  em 5 arquivos (bypass -- a logica do gate ja tem cobertura propria em
  modules.test.ts, 9/9). Suite: 47 failed | 774 passed (baseline estavel,
  zero regressao nova). tsc=0; build OK.
- TX (lifetime) com acesso total a todos os 6 modulos; 14 WaitlistLead
  intocados. Rede de seguranca (plan=start + planStatus active/suspended)
  confirmada vazia antes do deploy.
- STATUS: validacao real em producao (conta START, conta PRO, TX) pendente
  de confirmacao do Edu.

### E4 — Parte 1: gravar plan na assinatura (bloqueante corrigido) — 2026-07-03

- Achado critico da diagnose E4: desde a E1 (que corretamente removeu o
  plan:"pro" forcado do webhook), NADA gravava o campo Barbershop.plan no
  momento da assinatura -- toda conta ficaria presa em "start" mesmo pagando
  PRO, e o gate da E3 bloquearia indevidamente. Sem vitima ate agora (R$0 MRR).
- assinar/actions.ts (createSubscription): CAS ganhou plan:"pro" no data do
  updateMany, junto do asaasSubscriptionId -- gravado na CRIACAO da
  assinatura (nao no webhook, que continua so ativando planStatus).
  Where/guard/cancelamento de orfa (C2/P1-B) intactos.
- Teste ajustado preservando intencao (nao afrouxado): asserção do CAS
  passou a esperar plan:"pro" no data; teste vizinho de "nao ativa
  imediatamente" continua validando ausencia de planStatus (correto --
  plan e planStatus sao coisas diferentes).
- Suite: 45/45 em billing; 47 failed | 774 passed geral (baseline estavel).
  tsc=0; build OK. Commit 7db8927.
- Pendente: Parte 2 (UI de escolha de plano no onboarding + trial
  diferenciado 7d/15d + adaptar /dashboard/assinar para vender START).

### E4 — Escolha de plano + trial diferenciado (GRUPO E: 4/5 CONCLUIDO) — 2026-07-03

--- Parte 1 (bloqueante corrigido, ja em producao) ---

- assinar/actions.ts: CAS passou a gravar plan:"pro" no momento da criacao
  da assinatura (antes, nada gravava plan desde a E1 -- toda conta ficaria
  presa em "start" mesmo pagando PRO).

--- Parte 2 (escolha real de plano) ---

- onboarding/actions.ts: plan lido do formData com whitelist (start|pro,
  default seguro start); trial diferenciado (start=7d, pro=15d); waitlist
  continua 60d por cima, intocado. plan gravado no barbershop.create.
- onboarding/page.tsx: seletor de 2 cards (START R$59,90/7d vs PRO
  R$169,90/15d) no passo 2, estilo hardcoded local consistente com o resto
  da tela.
- assinar/actions.ts: le plan do formData (mesma whitelist); START coage
  para mensal (sem anual); value/descricao dinamicos por
  PLAN_PRICING[plan][billingType]; CAS grava o plan LIDO (nao mais fixo).
- assinar/page.tsx: seletor START|PRO; toggle Anual so aparece para PRO;
  headline/preco/features dinamicos por plano selecionado.
- 3 testes de onboarding atualizados (30d->7d default), preservando
  intencao (teste do default sem plan enviado = start = 7d correto).
- Suite: 47 failed | 774 passed (baseline estavel). tsc=0; build OK.
  Commit 77369ed.
- Fora de escopo (anotado para futuro): upgrade START->PRO de conta ja
  ativa; atualizacao da copy da landing/marketing (ainda mostra R$197 e
  trial generico).
- STATUS: validacao real em producao (onboarding + assinar, ambos planos)
  pendente de confirmacao do Edu.

### E4 — Escolha de plano + trial diferenciado (VALIDADA por teste) — 2026-07-03

- 8 novos testes automatizados (onboarding.test.ts +4, create-subscription.test.ts
  +4), exercitando as Server Actions de producao com sessao/FormData mockados --
  sem necessidade de conta real. Confirmam: onboarding grava plan e trialEndsAt
  corretos por plano (7d start / 15d pro), waitlist preserva 60d por cima;
  whitelist server-side rejeita plano adulterado nos dois pontos (onboarding e
  assinar); createSubscription usa PLAN_PRICING[plan][billingType] correto e
  nunca cobra o preco anual inexistente do START. Todos 8/8 verdes.
- Suite: 47 failed | 782 passed (829) -- baseline estavel, +8 passando, zero
  falha nova. tsc=0; build OK. Commit f574bf8.
- PENDENCIA CONHECIDA (nao bloqueante): validacao visual no navegador (criar
  conta nova via onboarding real) ficou impedida pela falta de um CPF de teste
  valido disponivel -- a validacao de CPF (do incidente anterior) esta
  funcionando corretamente e recusou CPFs inventados. Cobertura por teste
  automatizado é considerada suficiente para fechar a etapa; teste visual fica
  para quando houver CPF de teste disponivel, ou uma conta ja existente puder
  ser reaproveitada.

--- GRUPO E: 4/5 CONCLUIDO (falta so E5 -- add-on avulso) ---

### Fix — exclusao de servico em uso (P2003) — 2026-07-03

- deleteService (settings/actions.ts): passou a tratar
  Prisma.PrismaClientKnownRequestError code P2003 (servico com agendamento
  vinculado, FK RESTRICT) retornando {error} amigavel em vez de throw cru
  ("Este servico esta em uso em agendamentos existentes. Desative-o em vez
  de excluir."). Erros inesperados continuam subindo ao boundary.
- services-manager.tsx: handleDelete captura o retorno e exibe banner
  inline (mesmo padrao visual de erro ja usado no arquivo).
- Varredura confirmou: deleteProfessional JA fazia pre-checagem de uso
  corretamente (nenhuma correcao necessaria); comandaItem.delete e
  clientSubscription.delete sao leaf/baixo risco, nao alterados.
- Testes: 28/28 passando (retrocompativel). tsc=0; build OK. Commit f467016.

### Feature "Pacotes" — COMPLETA (Etapas 1-6) — 2026-07-04

Pacotes pré-pagos de servicos, vinculados ao cliente, com saldo que nao
reseta (diferente do Clube, que e recorrente mensal). Venda 100% manual
(sem Asaas/cobranca automatica); reconhecimento de receita na data do
PAGAMENTO, nao na venda nem no consumo.

- Etapa 1 (schema): Package, PackageItem (catalogo, so servicos),
  ClientPackage, ClientPackageItem (instancia por cliente, saldo em
  contador direto sem tabela de periodo), enum PackagePaymentStatus
  (pending/paid). FK aditiva clientPackageId em ComandaItem (onDelete
  SetNull). Migration 100% aditiva.
- Etapa 2: CRUD de catalogo em /dashboard/pacotes, espelhando Combos.
  Padrao return {error} (nao throw) conscientemente escolhido sobre o
  padrao do Combo.
- Etapa 3: venda manual (sellPackageToClient) -- snapshot de preco/nome de
  servico, expiresAt calculado de validityDays, reusa autocomplete de
  cliente da agenda. markPackagePaid idempotente via updateMany atomico
  (where paymentStatus:"pending", mesmo padrao do CAS de billing).
- Etapa 4: consumo na Comanda (addPackageServiceToComanda) -- espelha o
  Clube mas sem periodo (increment direto). Bloqueia consumo de pacote
  pending ou expirado. Comissao por RATEIO PONDERADO (mesmo motor do
  Combo): base_unidade = priceInCents x precoServico / soma ponderada;
  comissao = round(base x commissionPercent/100). 121/121 testes de
  comanda/comissao sem regressao; Clube (addPlanServiceToComanda)
  comprovadamente intocado.
- Etapa 5: secao "Pacotes" em Relatorios -- "A receber" (pending, sem
  filtro de periodo) e "Recebido no periodo" (paid, filtrado por paidAt).
  Fonte de receita SEPARADA do faturamento de comandas -- zero soma, zero
  dupla contagem (consumos ja entram a R$0 na comanda).
- Etapa 6: pagina publica /[slug]/pacotes -- vitrine dark-locked dos
  pacotes ativos, SEM integracao com agendamento, SEM venda automatica.
  CTA "Fale com a Barbearia" (wa.me com mensagem pre-definida mencionando
  o pacote). Reusa o mesmo email-gate da pagina principal. Botao "Copiar
  link" na gestao do dashboard.
- Em todas as 6 etapas: TX Barbearia, 14 WaitlistLead, Clube, Combo,
  gates (E1-E5), C1-C4, onboarding, cpf/email/terms-gate intocados. Zero
  migration destrutiva. tsc=0 e build OK em cada etapa.

### Migração de cor da landing (carvão) + atualização do Design System — 2026-07-04

- Os 5 arquivos de landing/marketing (hero, how-it-works, plans, features,
  footer) migrados da paleta antiga (preto puro #050505+derivados) para a
  nova escala carvão (#191919/#212121/#262626/#303030/#3a3a3a) -- dívida
  deixada deliberadamente de fora na migração anterior do dashboard/páginas
  públicas.
- Revalidação encontrou 2 ocorrências de #0D0D0D não mapeadas na diagnose
  original (hero:500, features:204) -- corrigidas para #262626 em vez de
  bump ingênuo, prevenindo inversão do hover nas cards de Features (hover
  clareia, não escurece).
- Gradientes de fade do hero (mockup + seção) ajustados para terminar em
  #191919, preservando a transição contínua entre seções.
- Footer mantido intencionalmente mais escuro que a base (#030303 -> #0D0D0D,
  preservando a proporção original "mais escuro que o corpo").
- Gradiente de marca do plano em destaque (#1A0608/#0F0308) preservado --
  não é escala neutra, não deveria ser tocado.
- LIVO_DESIGN_SYSTEM.md atualizado: tabela de tokens dark reflete os valores
  reais atuais; nota de changelog v2.1 adicionada.
- Escopo: só landing + doc. Dashboard, páginas dark-locked, tema claro,
  Pacotes, gates, TX Barbearia, 14 WaitlistLead -- intocados. tsc=0; build
  OK. grep de confirmação (paleta antiga em landing/) vazio.

### Programa Embaixadores — Frente A COMPLETA (A1-A5) — 2026-07-05

Mecanismo tecnico do Programa Embaixadores: assinatura recorrente do PRO
com preco fixo por conta (nao lifetime, nao pagamento unico), sistema de
indicacao GERAL (qualquer conta pode indicar), credito de mes gratis
automatico e idempotente via webhook, ativado por enquanto so para
embaixadores (isEmbaixador). Selo da foto do Taxinha/TX Barbearia como
embaixador oficial fica pendente da resposta dele (decisao de conteudo,
nao de engenharia).

- A1: schema aditivo -- customMonthlyPriceInCents, isEmbaixador,
  referralCode (@unique), referredByBarbershopId (auto-relacao
  Barbershop->Barbershop), freeMonthCredits, firstPaymentConfirmedAt.
- A2: override de preco em createSubscription -- conta com
  customMonthlyPriceInCents cobra esse valor fixo (sempre mensal,
  independente de billingType), plan continua "pro" (modulos/gates
  intactos). Imune a reajustes futuros do preco padrao do PRO.
- A3: webhook detecta a 1a mensalidade paga de verdade (CAS via
  firstPaymentConfirmedAt:null, idempotente contra reentrega) e credita
  +1 freeMonthCredits no indicador. TX Barbearia protegida pelo mesmo
  guard planStatus!=lifetime do C1. Fase 1: credito interno, aplicacao
  manual por enquanto -- automacao real via Asaas fica para Fase 2.
- A4: captura de ?ref=CODIGO via cookie de 24h, cobrindo os 3 pontos de
  entrada reais (register direto, register->dashboard->onboarding via
  Google, onboarding?ref= direto). Validacao silenciosa -- codigo
  invalido nunca bloqueia o cadastro.
- A5: secao "Indique e ganhe" em Settings, com geracao LAZY e idempotente
  do referralCode (8 caracteres, alfabeto sem ambiguidade, protegido
  contra corrida), link de indicacao copiavel, selo "Embaixador Livo"
  condicional, saldo de freeMonthCredits exibido.
- Em todas as 5 etapas: zero migration destrutiva, TX Barbearia e 14
  WaitlistLead intocados, gates/Pacotes/onboarding-core/webhook-core
  (C1)/CAS(C2) nunca alterados em comportamento -- so extensoes aditivas.
  npx vitest run identico ao baseline (47/789) em cada etapa; tsc=0 e
  build OK sempre.

### Frente B (parte 1): reestruturação da landing — 2026-07-05

- Home enxuta: Hero integral + 3 passos resumidos (CTA -> /produto) + 4
  features em destaque (CTA -> /produto) + resumo Start/Pro (CTA -> /planos)
  - Partnership (intocada) + Footer.
- Novas paginas: /produto (6 features + AISection + passo-a-passo detalhado)
  e /planos (3 cards completos, comparativo).
- TRIAL_DAYS[plan] criado em pricing.ts como fonte unica (start:7, pro:15,
  prime:15 placeholder); onboarding/actions.ts passou a consumir dali
  (mesmos valores, zero mudanca de comportamento).
- Toda copy de preco/trial desatualizada corrigida (R$197->R$169,90; "30
  dias" -> 7/15 conforme o plano) em plans/hero/how-it-works/layout(SEO)/
  register.
- Armadilha de ancora eliminada: id="produto" (que apontava para "Como
  funciona") removido; /produto agora e rota real.
- Residuo de paleta antiga corrigido em navbar.tsx e partnership.tsx
  (gradiente de marca preservado, nao virou cinza neutro).
- Deixados intocados de proposito: oferta-30-dias/60-dias (campanhas com
  prazo intencional) e termos/page.tsx (texto legal versionado -- fica
  como pendencia PROPRIA, fora desta reestruturacao).
- npx vitest run identico ao baseline (47/789); tsc=0; build OK.
- /embaixadores NAO criado (Opcao A) -- proxima etapa da Frente B.
