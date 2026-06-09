# LIVO PROJECT STATUS

Version: 1.3
Last Updated: 09/06/2026
Status: MVP Operacional — Sprint GAP-03 em execução
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
UX .................. 6/10
Engenharia .......... 7/10  ← P0 Sprint concluído
Escalabilidade ...... 6/10  ← Índices adicionados
IA .................. 5/10
Segurança ........... 6/10  ← Rate limiting, roles, debug routes

Score Geral: 6.2/10

Score Funcional (18 módulos): 7.5/10  ← GAP-03 75% completo

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

Status: Produção ⚠️ sem edição

- Visualização mensal
- Visualização semanal
- Visualização diária
- Criação de agendamentos

---

## Clientes

Status: Produção ⚠️ edição incompleta

- CRUD (criar + notas + bloquear)
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

Status: ⚠️ Em Finalização — 75% completo

**Etapas concluídas:**
- ✅ Etapa 1: `actions.ts` — 4 Server Actions (criar, editar, toggle, listar)
- ✅ Etapa 2: `page.tsx` + `loading.tsx` — Server Component + skeleton
- ✅ Etapa 3: `profissionais-client.tsx` — UI completa (lista, modais, toggle com confirmação)

**Pendente:**
- ⏳ Etapa 4: item de navegação no sidebar (`dashboard-layout-client.tsx`)

---

# EM CONSTRUÇÃO

- CRUD Serviços (página dedicada)
- Horários individuais por profissional
- Uploads (logo, avatar, fotos)
- Booking Público — melhorias
- Edição de agendamento (GAP-01)
- Edição completa de cliente (GAP-02)

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

## P1 — Bloqueadores funcionais

- GAP-01: Edição de agendamento — pendente
- GAP-02: Edição completa de cliente — pendente
- GAP-03: Gestão de profissionais — **⚠️ EM ANDAMENTO (75%)**
- GAP-04: PaymentMethod enum drift — pendente
- GAP-05: Recuperação de senha — pendente

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

## Sprint GAP-03 — Gestão de Profissionais (09/06/2026 — em andamento)

Etapas 1, 2 e 3 concluídas. Pendente apenas navegação (Etapa 4).
