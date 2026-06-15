# LIVO MASTER AUDIT — AUDITORIA DE PRODUÇÃO

**Data:** 2026-06-15  
**Auditor:** Leitura direta de código-fonte de produção  
**Escopo:** Segurança, isolamento de dados, consistência financeira, confiabilidade em produção  
**Fonte de verdade:** Código. Não documentação, não comentários, não testes.  
**Estado base:** Pós-MISSÃO 03 — 7 bloqueadores críticos eliminados. 704/704 testes passando.

---

## RESUMO EXECUTIVO

O LIVO está em condição de go-live para usuários reais. Os 7 bloqueadores originais (RC-1, RC-2, RA-1, RA-2, RA-3, RA-4, brute force) foram eliminados. O isolamento multi-tenant está correto em todos os endpoints auditados — nenhum vazamento de dados entre barbearias foi encontrado. As operações financeiras críticas (estoque, comanda, agendamento) são atômicas.

Foram identificados **4 riscos P1 remanescentes** que não bloqueam o lançamento mas exigem resolução nas primeiras 2 semanas de operação. O risco mais sério é o ordenamento de webhooks do Asaas, que pode suspender clientes pagantes incorretamente.

---

## O QUE ESTÁ SEGURO

### Isolamento Multi-Tenant

Verificado em todos os endpoints:

- **Agenda**: `appointment.findFirst({ where: { id, barbershopId } })` em `updateAppointmentStatusCore`, `updateAppointmentCore`, `moveAppointmentCore`. O `barbershopId` vem do membership, nunca do input do cliente.
- **Comandas**: comanda localizada por `{ id, barbershopId, status: "open" }`. Escrita só ocorre se a comanda pertence ao tenant correto.
- **Produtos**: `updateMany`, `deleteMany`, `findFirst` sempre incluem `barbershopId: membership.barbershopId`.
- **Relatórios**: `comanda.findMany({ where: { barbershopId, status: "closed", closedAt: { gte, lte } } })` — escopo correto.
- **Estoque (movimentações)**: produto é validado com `findFirst({ where: { id, barbershopId } })` antes de qualquer movimentação.
- **Booking público** (`[slug]/book/actions.ts`): `service.findFirst({ where: { id, barbershopId } })` e `professional.findFirst({ where: { id, barbershopId } })` antes de `createAppointmentCore`. Nenhum dado cross-tenant retornado.
- **Dashboard analytics**: cache com `["dashboard-analytics", barbershopId]` explícito na key — isolamento por tenant garantido (correção RC-2).

**Nenhum leak cross-tenant detectado nas leituras.**

### Autenticação e Autorização

- **JWT strategy (NextAuth v5)**: `token.sub = userId`. `barbershopId` não está no token — derivado do banco via `getCurrentMembership()` em cada request. Impossível forjar contexto via JWT adulterado.
- **`requireRole()`**: redireciona para `/dashboard` se role não está na lista permitida.
- **Login brute force**: rate limiter em memória — 5 tentativas falhas por e-mail em 15 minutos. Bloqueio silencioso (mesma resposta que senha errada — não revela se é rate limit ou senha incorreta).
- **Webhook Asaas**: token header `asaas-access-token` vs `process.env.ASAAS_WEBHOOK_TOKEN`. Sem env var configurada, requests sem header recebem 401 (`null !== undefined` = `true` em JS).

### Operações Atômicas Críticas

- **Duplo agendamento (RA-1)**: `pg_advisory_xact_lock(hashtext(professionalId))` serializa criações para o mesmo profissional. Conflict check autoritativo dentro do lock, dentro do `$transaction`.
- **Estoque em comandas (RA-3)**: `product.updateMany({ where: { id, stockQuantity: { gte: quantity } }, data: { decrement } })` em `addProdutoItem` e `fecharComanda`. Se `count === 0` → lança erro. Estoque nunca fica negativo.
- **Orphan account (RA-2)**: `user.create + membership.create + invitation.update` em único `$transaction`. Se qualquer operação falhar, nada é persistido.
- **Prompt injection (RA-4)**: `ALLOWED_ROLES = new Set(["user", "assistant"])` — `role: "system"` bloqueado. Limite de 50 mensagens × 4000 chars. System prompt 100% server-controlled.

### Billing Gate

- Middleware (`src/middleware.ts`) injeta `x-pathname` → layout avalia `BILLING_EXEMPT` corretamente. Sem redirect loop para `/dashboard/assinar` (correção RC-1).
- `planStatus: lifetime` protegido em todos os handlers do webhook: `{ planStatus: { not: PlanStatus.lifetime } }` em todos os `updateMany`.
- Transições de estado: `trial → active`, `active → suspended`, `active → cancelled` via webhook. Sem downgrade de `lifetime` possível.

### Onboarding

Totalmente atômico: `user.update + barbershop.create + professional.create + membership.create + service.createMany + businessHour.createMany` em um único `$transaction`. Sem estados intermediários persistíveis.

---

## RISCOS CRÍTICOS P0

**Nenhum risco P0 identificado.**

Os 7 bloqueadores originais foram eliminados. Não há vulnerabilidade ativa capaz de causar corrupção imediata de dados em operação normal.

---

## RISCOS ALTOS P1

### P1-A — Webhook Asaas: Eventos Fora de Ordem Suspendem Clientes Pagantes

**Arquivo:** `src/app/api/webhooks/asaas/route.ts`

O handler processa cada evento de forma independente, sem armazenar sequência ou timestamp do evento. Em sistemas de pagamento, Asaas pode entregar eventos fora de ordem (documentado no setor):

```
Cenário:
1. Assinatura renovada com sucesso
2. Asaas entrega PAYMENT_CONFIRMED → planStatus = active ✅
3. Asaas entrega (com atraso) PAYMENT_OVERDUE do ciclo anterior → planStatus = suspended ❌
```

Resultado: cliente pagante fica suspenso sem inadimplência ativa.

**Recuperação impossível via UI:** `assinar/actions.ts` bloqueia nova assinatura para `planStatus = suspended` (comportamento correto para evitar subscription duplicada). O cliente só sai do estado suspenso quando:
- Asaas entrega um `PAYMENT_CONFIRMED` do ciclo atual (que pode já ter sido entregue antes do `OVERDUE` tardio)
- OU o suporte intervém manualmente no banco

**Impacto:** Churn de clientes pagantes. Risco operacional alto após escala.

**Solução:** Adicionar campo `lastBillingEventAt: DateTime?` ao `Barbershop`. No handler: só aplicar `suspended`/`cancelled` se o evento for mais recente que o último `active`. Alternativa: armazenar IDs de eventos processados com timestamp.

---

### P1-B — `asaasSubscriptionId` sem `@unique` + Race Condition na Criação de Assinatura

**Arquivos:** `src/app/(dashboard)/dashboard/assinar/actions.ts`, `prisma/schema.prisma:81`

O campo no schema:
```prisma
asaasSubscriptionId String?   // linha 81 — sem @unique
```

O fluxo de criação lê `planStatus` FORA de transação, chama a API externa do Asaas (latência de 1-3s), depois grava o ID:

```typescript
// Leitura (sem lock)
if (barbershop.planStatus === PlanStatus.active) return { error };

// Chamada externa (janela de race condition)
const subscription = await createAsaasSubscription({ ... });

// Escrita (sobrescreve qualquer valor anterior)
await db.barbershop.update({ data: { asaasSubscriptionId: subscription.id } });
```

Dois POSTs simultâneos (double-click, two browser tabs) durante o status `trial`:
1. Ambos leem `planStatus = trial` → passam
2. Ambos criam subscriptions no Asaas (duas cobranças)
3. O segundo `update` sobrescreve `asaasSubscriptionId`
4. A primeira subscription fica órfã — sendo cobrada no Asaas sem ID rastreável no LIVO

**Impacto:** Cobranças duplicadas no Asaas. Subscriptions órfãs inarrast... sem correspondência no LIVO. Risco financeiro para o cliente.

**Solução:** Após criar subscription no Asaas, usar `updateMany({ where: { id, asaasSubscriptionId: null } })`. Se `count === 0` (outro request já gravou um ID), cancelar a subscription recém-criada no Asaas. Adicionar `@unique` ao campo.

---

### P1-C — Sem Rate Limit na Rota Pública de Agendamento

**Arquivo:** `src/app/[slug]/book/actions.ts`

`createAppointment` é público (sem autenticação), não tem:
- Rate limit por IP
- CAPTCHA
- Throttle por `professionalId`
- Validação de formato de telefone (aceita "1")

Cenário de ataque:
1. Enumerar todos os slots via `getAvailableSlots` (também pública, sem auth)
2. Preencher toda a agenda de um profissional com agendamentos falsos
3. Bloquear operação real da barbearia sem custo

**Impacto:** Negação de serviço direcionada a uma barbearia. Baixo custo para o atacante, alto impacto operacional para o cliente do LIVO.

**Solução:** Rate limit por IP via Upstash (10 agendamentos/hora/IP). CAPTCHA no formulário público.

---

### P1-D — Sem Rate Limit na Rota da Lívia

**Arquivo:** `src/app/api/livia/route.ts`

A rota requer membership (autenticado) mas não tem rate limiting por usuário ou por barbearia. Um usuário autenticado pode enviar 50 mensagens × 4000 chars em loop contínuo sem restrição de frequência.

**Impacto:** Custo ilimitado de Anthropic API por conta de usuário. Uma conta comprometida ou mal-intencionada pode gerar custo relevante antes de ser detectada.

**Solução:** Rate limit por `userId` via Upstash (ex: 100 mensagens/hora/usuário).

---

## VULNERABILIDADES SILENCIOSAS

### VS-1 — `addStockMovement` Não-Atômico (Admin: TOCTOU Parcial)

**Arquivo:** `src/app/(dashboard)/dashboard/produtos/actions.ts:208-239`

```typescript
// Leitura fora de transação
const product = await db.product.findFirst({ where: { id, barbershopId } });
const newStock = product.stockQuantity + input.quantity;
if (newStock < 0) throw new Error("Estoque insuficiente.");

// Escrita com valor fixo calculado na leitura
await db.$transaction([
  db.stockMovement.create({ ... }),
  db.product.update({
    where: { id: input.productId },  // sem gte check
    data: { stockQuantity: newStock },  // valor calculado antes do lock
  }),
]);
```

Dois ajustes manuais simultâneos (-5 cada, estoque=10):
- Ambos leem `stockQuantity=10`
- Ambos calculam `newStock=5`, ambos passam na verificação (5 >= 0)
- Ambos escrevem `stockQuantity=5` (last writer wins)
- Resultado: stock=5 em vez de 0. Um ajuste é silenciosamente perdido

**Probabilidade:** Baixa (operação admin; raramente dois admins ajustam o mesmo produto simultaneamente). **Impacto:** Inventário impreciso.

Contraste: `addProdutoItem` e `fecharComanda` usam o padrão atômico correto (`updateMany WHERE gte`). O path admin não foi migrado.

---

### VS-2 — `updateAppointmentCore` e `moveAppointmentCore` sem Advisory Lock

**Arquivo:** `src/lib/appointment-core.ts`

`createAppointmentCore` tem `pg_advisory_xact_lock`. As funções de edição e movimentação não têm. Dois usuários editando o mesmo profissional para horários sobrepostos simultaneamente podem criar conflito.

**Probabilidade:** Muito baixa (requer dois usuários editando o mesmo profissional simultaneamente). **Impacto:** Double booking via edição, não criação.

---

### VS-3 — Staff Bypass de Billing Suspension via Server Actions Diretos

**Arquivo:** `src/lib/permissions.ts:105-112`

O billing check no layout da dashboard bloqueia todos os usuários (inclui barbers). Mas `requireMembershipWithBilling()` (disponível para routes explícitas) só aplica billing check para `role === "owner"`.

Server actions usam `requireMembership()` ou `requireRole()` — sem billing check. Um barber com cookie de sessão válido pode chamar server actions via POST HTTP direto e criar agendamentos/comandas em uma barbearia `suspended` ou `cancelled`.

**Justificativa atual:** O design é intencional ("Apenas owners são verificados — membros convidados seguem o billing da barbearia"). **Impacto real:** Barbershops com billing cancelado podem continuar operando via acesso direto de staff, sem que o owner pague. Risco de negócio, não de segurança.

---

### VS-4 — Validação de CPF Superficial

**Arquivo:** `src/app/(dashboard)/dashboard/assinar/actions.ts:39-41`

```typescript
if (!cpfCnpj || cpfCnpj.replace(/\D/g, "").length < 11) {
  return { error: "CPF inválido. Digite um CPF válido." };
}
```

Só verifica contagem de dígitos. Sem validação de dígitos verificadores (algoritmo mod 11). CPFs matematicamente inválidos (`11111111111`) passam pela validação do LIVO e são rejeitados pelo Asaas com erro genérico — o usuário recebe "Erro ao criar assinatura" sem saber o motivo real.

**Impacto:** UX ruim. Sem risco de dados.

---

### VS-5 — Webhook sem Idempotency Key

**Arquivo:** `src/app/api/webhooks/asaas/route.ts`

Nenhum ID de evento é armazenado após processamento. Redeliveries do Asaas (timeout, erro 5xx) reprocessam o mesmo evento. Para a maioria dos casos, `updateMany` é idempotente. Mas combinado com P1-A (ordering), redeliveries ampliam a janela de aplicação de eventos fora de ordem.

---

### VS-6 — `getCurrentMembership()` sem Filtro de `barbershopId`

**Arquivo:** `src/lib/permissions.ts:33`

```typescript
const membership = await db.membership.findFirst({
  where: { userId, isActive: true },  // sem barbershopId
});
```

Se um usuário tem memberships em duas barbearias diferentes (possível via convites), `findFirst` retorna a primeira por ordem de inserção no banco — resultado não-determinístico conforme a barbearia que inseriu primeiro.

**Não é exploração de segurança**: o usuário não acessa dados da barbearia errada propositalmente — ele simplesmente "cai" sempre na mesma barbearia sem saber qual. Não há capacidade de trocar de contexto.

**Impacto:** Usuário multi-barbearia fica preso na primeira barbearia onde foi inserido. Limitação de UX, não falha de segurança.

---

## POSSÍVEIS CORRUPÇÕES DE DADOS

| # | Situação | Probabilidade | Impacto |
|---|---------|--------------|---------|
| CD-1 | `addStockMovement` race: dois ajustes manuais simultâneos no mesmo produto — um ajuste é perdido | Muito baixa | Estoque impreciso (inventário) |
| CD-2 | Subscription creation race: dois POSTs simultâneos ao assinar — subscription órfã no Asaas | Baixa (double-click) | Cobrança indevida no Asaas |
| CD-3 | Webhook ordering: PAYMENT_OVERDUE chega após PAYMENT_CONFIRMED — `planStatus` incorreto | Média (depende do Asaas) | Cliente pagante suspenso incorretamente |
| CD-4 | Slug creation race no onboarding: dois usuários com mesmo slug em paralelo — segundo recebe erro Prisma não traduzido | Muito baixa | Sem corrupção; apenas UX ruim |

---

## POSSÍVEIS VAZAMENTOS MULTI-TENANT

**Nenhum vazamento detectado.**

Todos os endpoints com dados de uma barbearia usam `barbershopId` derivado do membership (autenticado) ou do slug da URL (booking público) com filtros explícitos no banco.

O único ponto monitorado (VS-6) não causa vazamento: o usuário fica preso em UMA barbearia, não acessa dados de outra.

---

## RISCOS FINANCEIROS

| # | Risco | Probabilidade | Impacto |
|---|-------|--------------|---------|
| RF-1 | Webhook out-of-order suspende cliente pagante (P1-A) | Média | Churn, suporte, credibilidade |
| RF-2 | Race condition cria subscription órfã no Asaas (P1-B) | Baixa | Cliente paga sem ativar acesso |
| RF-3 | Lívia sem rate limit — custo Anthropic irrestrito (P1-D) | Baixa (escala) | Custo operacional imprevisto |
| RF-4 | `addStockMovement` race — inventário impreciso (VS-1) | Muito baixa | Descrepância de estoque físico vs sistema |

---

## RECOMENDAÇÕES PRIORIZADAS

### Semana 1 (pós go-live)

**R1 — Rate limit no booking público** (P1-C)  
Upstash rate limit: 10 agendamentos/hora/IP em `createAppointment`.  
Arquivo: `src/app/[slug]/book/actions.ts`. Estimativa: 2h.

**R2 — Rate limit na Lívia por userId** (P1-D)  
Upstash rate limit: 100 mensagens/hora/userId em `/api/livia/route.ts`.  
Arquivo: `src/app/api/livia/route.ts`. Estimativa: 1h.

### Semana 2

**R3 — Webhook ordering: timestamp guard** (P1-A)  
Adicionar `lastBillingEventAt: DateTime?` ao `Barbershop`. No handler: só aplicar `suspended`/`cancelled` se o evento for mais recente que o último `active`.  
Arquivos: `src/app/api/webhooks/asaas/route.ts`, `prisma/schema.prisma`. Estimativa: 4h + migration.

**R4 — Subscription creation idempotency** (P1-B)  
Após criar subscription no Asaas: `db.barbershop.updateMany({ where: { id, asaasSubscriptionId: null } })`. Se `count === 0`, cancelar subscription criada. Adicionar `@unique` ao campo.  
Arquivo: `src/app/(dashboard)/dashboard/assinar/actions.ts`. Estimativa: 3h + migration.

### Semana 3-4

**R5 — Atomic `addStockMovement`** (VS-1)  
Converter para callback-style `$transaction` com `updateMany WHERE stockQuantity >= |delta|`.  
Arquivo: `src/app/(dashboard)/dashboard/produtos/actions.ts:225-239`. Estimativa: 1h.

**R6 — Validação de CPF com dígito verificador** (VS-4)  
Algoritmo mod 11 antes de `createAsaasCustomer`.  
Arquivo: `src/app/(dashboard)/dashboard/assinar/actions.ts`. Estimativa: 30min.

---

## CLASSIFICAÇÃO FINAL

```
╔══════════════════════════════════════════════════════════════╗
║  SISTEMA ESTÁ PRONTO PARA USUÁRIOS REAIS?                   ║
║                                                              ║
║                          SIM                                 ║
║                                                              ║
║  Com ressalva: resolver P1-A (webhook ordering) e P1-C      ║
║  (rate limit booking) nas primeiras 2 semanas de operação.  ║
╠══════════════════════════════════════════════════════════════╣
║  PRINCIPAL BLOQUEADOR:                                       ║
║  Webhook out-of-order pode suspender clientes pagantes.      ║
║  Não bloqueia o go-live mas é o risco de maior impacto       ║
║  financeiro/operacional após a base de clientes crescer.    ║
╠══════════════════════════════════════════════════════════════╣
║  NÍVEL DE RISCO: MÉDIO                                       ║
╚══════════════════════════════════════════════════════════════╝
```

| Dimensão | Status | Detalhe |
|---------|--------|---------|
| Multi-tenant isolamento | ✅ SEGURO | Todos os endpoints escopados por `barbershopId` derivado do membership |
| Autenticação | ✅ SEGURO | JWT strategy, rate limit login, sem bypass detectado |
| Billing gate | ✅ SEGURO | Middleware injetando `x-pathname`, sem redirect loop |
| Agendamento (create) | ✅ SEGURO | Advisory lock + in-tx conflict check |
| Estoque (comanda) | ✅ SEGURO | Atomic `updateMany WHERE gte` em `addProdutoItem` e `fecharComanda` |
| Orphan accounts | ✅ SEGURO | `user.create` dentro do `$transaction` no fluxo de convite |
| Prompt injection (Lívia) | ✅ SEGURO | Whitelist de roles, limite de mensagens e conteúdo |
| Onboarding | ✅ SEGURO | Totalmente atômico em `$transaction` |
| Webhook ordering | ⚠️ P1 | Pode suspender clientes pagantes se eventos chegarem fora de ordem |
| Subscription race | ⚠️ P1 | Subscription órfã no Asaas em double-submit |
| Booking público rate limit | ⚠️ P1 | Sem throttle — calendário spam attack possível |
| Lívia rate limit | ⚠️ P1 | Sem throttle por usuário — custo Anthropic irrestrito |
| Estoque (admin manual) | ⚠️ P2 | `addStockMovement` não-atômico (TOCTOU baixa prob.) |
| Agendamento (update/move) | ⚠️ P2 | Sem advisory lock (menor risco que create) |
| Multi-barbershop UX | ⚠️ P2 | `getCurrentMembership` retorna primeiro ativo arbitrariamente |

---

*Auditoria conduzida por leitura direta de código de produção. Nenhum teste, documentação, comentário ou doc de status foi usado como fonte de verdade.*
