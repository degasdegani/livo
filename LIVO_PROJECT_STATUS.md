# LIVO PROJECT STATUS

Version: 1.5
Last Updated: 10/06/2026
Status: MVP Operacional — Sprint GAP-05 em execução (Integração Total da Agenda)
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

Produto ............. 7/10
UX .................. 7/10  ← GAP-01/02/03 concluídos
Engenharia .......... 7/10  ← P0 Sprint + P1 Sprint concluídos
Escalabilidade ...... 6/10  ← Índices adicionados
IA .................. 5/10
Segurança ........... 6/10  ← Rate limiting, roles, debug routes

Score Geral: 6.5/10

Score Funcional (18 módulos): 8.0/10  ← GAP-01 a GAP-04 concluídos

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
