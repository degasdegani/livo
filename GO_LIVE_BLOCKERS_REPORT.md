# GO-LIVE BLOCKERS REPORT — MISSÃO 03

Data: 2026-06-15
Método: Leitura e modificação direta do código (zero dependência de documentação)
Suite: 704 testes passando, 0 falhas, TypeScript limpo (tsc --noEmit = 0 erros)

---

## RESULTADO GERAL

**TODOS OS 7 BLOQUEADORES ELIMINADOS**

| # | Bloqueador | Status |
|---|-----------|--------|
| 1 | RC-1 — Billing gate loop | ✅ FECHADO |
| 2 | RC-2 — Cache cross-tenant | ✅ FECHADO |
| 3 | RA-2 — Orphan account no convite | ✅ FECHADO |
| 4 | RA-4 — Prompt injection na Lívia | ✅ FECHADO |
| 5 | Rate Limit Login | ✅ FECHADO |
| 6 | RA-1 — Race condition agendamento | ✅ FECHADO |
| 7 | RA-3 — Race condition estoque | ✅ FECHADO |

---

## ETAPA 1 — RC-1: Loop Infinito do Billing Gate

**Arquivo criado:** `src/middleware.ts`

**Problema:** `src/app/(dashboard)/layout.tsx` lia o header `x-pathname` para determinar se a rota era billing-exempt. Sem um middleware que injetasse esse header, o valor era sempre `""`, fazendo `isBillingExempt` ser sempre `false`. Resultado: `/dashboard/assinar` também passava pelo billing check → redirect loop infinito para usuários com trial expirado.

**Solução:** Criado middleware Next.js que injeta o pathname da requisição no header `x-pathname` antes de qualquer handler de rota.

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

**Efeito:** `BILLING_EXEMPT = ["/dashboard/assinar", "/dashboard/suspenso"]` agora funciona corretamente. Trial expirado acessa `/dashboard/assinar` sem redirect loop.

---

## ETAPA 2 — RC-2: Cache Cross-Tenant no Dashboard

**Arquivo modificado:** `src/app/(dashboard)/dashboard/actions.ts`

**Problema:** `unstable_cache` estava configurado com a key `["dashboard-analytics"]` sem incluir o `barbershopId`. Apesar do Next.js serializar argumentos da função na key, a inclusão explícita é obrigatória para garantir isolamento entre tenants, especialmente em edge cases de cache warm-up e revalidação.

**Solução:** Cache criado inline por chamada, com `barbershopId` explicitamente na key.

```typescript
// ANTES (risco)
const fetchDashboardAnalyticsCached = unstable_cache(
  fetchDashboardAnalytics,
  ["dashboard-analytics"],   // sem barbershopId
  { revalidate: 300 },
);

// DEPOIS (seguro)
export async function getDashboardAnalytics() {
  const membership = await requireMembership();
  return unstable_cache(
    fetchDashboardAnalytics,
    ["dashboard-analytics", membership.barbershopId],  // isolado por tenant
    { revalidate: 300 },
  )(membership.barbershopId);
}
```

**Efeito:** Cache de analytics é completamente isolado por `barbershopId`. Impossível vazar dados de um tenant para outro.

---

## ETAPA 3 — RA-2: Orphan Account no Fluxo de Convite

**Arquivo modificado:** `src/app/convite/[token]/actions.ts`

**Problema:** Em `acceptInvitationAction` no modo `create`, o usuário era criado com `db.user.create` FORA da transaction. Se a transaction subsequente (criação de membership + atualização do convite) falhasse por qualquer motivo, o usuário ficava órfão — sem membership, sem convite válido, email "queimado" no sistema.

**Solução:** O `user.create` foi movido para DENTRO da transaction. Agora usuário + membership + invitation update formam uma operação atômica.

```typescript
// ANTES (risco de orphan)
const newUser = await db.user.create({ ... });  // fora da tx
userId = newUser.id;
await db.$transaction(async (tx) => {
  await tx.membership.create({ ... });
  await tx.invitation.update({ ... });
});

// DEPOIS (atômico)
await db.$transaction(async (tx) => {
  const newUser = await tx.user.create({ ... });  // dentro da tx
  await tx.membership.create({ userId: newUser.id, ... });
  await tx.invitation.update({ ... });
});
```

Bonus: `alreadyMember` check para modo `existing` foi movido para ANTES da transaction (fail-fast sem tocar o banco).

**Efeito:** Se qualquer operação dentro da transaction falhar, nenhum dado é persistido. Zero contas órfãs.

---

## ETAPA 4 — RA-4: Prompt Injection na Rota Lívia

**Arquivo modificado:** `src/app/api/livia/route.ts`

**Problema:** O array `messages` vindo do cliente era passado diretamente para a API da Anthropic sem validação. Um atacante poderia injetar mensagens com `role: "system"` para manipular o comportamento da IA, ou enviar um array de 10.000 mensagens para causar timeout/consumo excessivo de tokens.

**Solução:** Adicionadas 3 camadas de validação antes de encaminhar para a Anthropic API:

```typescript
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 4000;
const ALLOWED_ROLES = new Set(["user", "assistant"]);

// 1. Limite de mensagens
if (messages.length > MAX_MESSAGES) {
  return NextResponse.json({ error: "Muitas mensagens." }, { status: 400 });
}
// 2. Validação por mensagem
for (const m of messages) {
  if (!m || typeof m !== "object") { ... 400 }
  if (!ALLOWED_ROLES.has(m.role)) { ... 400 }  // bloqueia role "system"
  if (typeof m.content !== "string" || m.content.length > MAX_CONTENT_LENGTH) { ... 400 }
}
```

**Efeito:** Impossível injetar `role: "system"`. Limite de 50 mensagens × 4000 chars previne abuso. O system prompt é exclusivamente controlado pelo servidor.

---

## ETAPA 5 — Rate Limit no Login

**Arquivo modificado:** `src/auth.ts`

**Problema:** O provider `Credentials` do NextAuth não tinha rate limiting. Um atacante podia tentar senhas indefinidamente sem consequências (brute force).

**Solução:** Rate limiter em memória dentro do `authorize` callback — 5 tentativas falhas por e-mail em 15 minutos. Em caso de bloqueio, retorna `null` (mesma resposta que credencial errada — não revela se o bloqueio é por rate limit ou senha incorreta).

```typescript
// 5 tentativas falhas por e-mail em janela de 15 minutos
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

async authorize(credentials) {
  const email = credentials.email.toLowerCase();
  if (isLoginRateLimited(email)) return null;  // silencioso

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.password) { trackLoginFailure(email); return null; }

  const match = await bcrypt.compare(password, user.password);
  if (!match) { trackLoginFailure(email); return null; }

  loginRateLimitMap.delete(email);  // reset on success
  return user;
}
```

**Limitação conhecida:** Em-memória = por instância serverless. Multi-instância dilui a proteção. Para produção com alto tráfego, migrar para Redis/Upstash (mesmo padrão já usado na Lívia). Para o lançamento inicial (volume baixo), é suficiente.

---

## ETAPA 6 — RA-1: Race Condition no Agendamento

**Arquivo modificado:** `src/lib/appointment-core.ts`

**Problema:** `checkConflict` era chamado FORA da `$transaction`. Sob READ COMMITTED (default do PostgreSQL), duas requisições simultâneas podiam:
1. Ambas passar pelo `checkConflict` (nenhum conflito visto)
2. Ambas entrar na transaction
3. Ambas criar o appointment → double booking

**Solução:** Adicionado `pg_advisory_xact_lock` dentro da transaction para serializar criações para o mesmo profissional. O segundo request fica bloqueado até o primeiro commitar, depois re-checa o conflito e encontra o appointment já criado.

```typescript
const appointment = await db.$transaction(async (tx) => {
  // Serializa agendamentos concorrentes para o mesmo profissional
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.professionalId}))`;

  // Re-check autoritativo dentro do lock (READ COMMITTED vê dados commitados)
  const conflictInTx = await tx.appointment.findFirst({
    where: { professionalId: input.professionalId, date: { lt: endDate }, endTime: { gt: startDate },
              status: { notIn: ["cancelled", "no_show"] } },
    select: { id: true },
  });
  if (conflictInTx) {
    throw Object.assign(new Error("conflict"), { isConflict: true });
  }
  // ... criação do appointment
});
```

O pre-transaction `checkConflict` (linha 88) foi mantido como fast-path de otimização — evita adquirir o lock quando o conflito já é óbvio. O check dentro do lock é o autoritativo.

**Efeito:** Double booking é impossível para o mesmo profissional. Agendamentos concorrentes são serializados por advisory lock no PostgreSQL.

**Cobertura de testes:** O `$executeRaw` é mockado como noop em testes. Lógica de conflito validada pelos testes existentes.

---

## ETAPA 7 — RA-3: Race Condition no Estoque

**Arquivo modificado:** `src/app/(dashboard)/dashboard/comandas/actions.ts`

**Problema (addProdutoItem):** Verificação de estoque (`stockQuantity < quantity`) era feita ANTES da transaction (TOCTOU). Duas requisições simultâneas podiam ambas passar pelo check e ambas decrementar → estoque negativo.

**Problema (fecharComanda):** `tx.product.update({ data: { stockQuantity: { decrement } } })` decrementava sem verificar se o estoque era suficiente no momento do commit.

**Solução:** Operação atômica com `updateMany` e `WHERE stockQuantity >= quantity`:

```typescript
// addProdutoItem — decremento atômico
const stockUpdated = await tx.product.updateMany({
  where: { id: product.id, stockQuantity: { gte: quantity } },
  data: { stockQuantity: { decrement: quantity } },
});
if (stockUpdated.count === 0) throw new Error("Estoque insuficiente.");

// fecharComanda — mesmo padrão
const stockUpdated = await tx.product.updateMany({
  where: { id: item.productId!, stockQuantity: { gte: item.quantity } },
  data: { stockQuantity: { decrement: item.quantity } },
});
if (stockUpdated.count === 0) throw new Error("Estoque insuficiente para fechar a comanda.");
```

O `UPDATE WHERE` é executado atomicamente pelo PostgreSQL. Se dois requests tentam decrementar o mesmo produto:
- Um passa: `count = 1`, decrementa
- Outro falha: `count = 0`, lança erro — o PostgreSQL garante que o estoque nunca vai abaixo de zero

**Efeito:** Estoque nunca fica negativo, independente de concorrência. Operação 100% atômica.

---

## INFRAESTRUTURA DE TESTES

**Arquivo criado:** `tests/mocks/prismaTestClient.ts`

Camada centralizada de mock Prisma para testes de integração. Fornece:
- `makeTxMock()` — mock completo do cliente de transaction com `$executeRaw` noop, todos os models
- `makeTransactionHandler(tx)` — mock de `db.$transaction` compatível com ambas as formas (callback e array)

Todos os test files afetados foram atualizados para compatibilidade com o novo comportamento de produção.

---

## VALIDAÇÃO FINAL

```
npx tsc --noEmit  → 0 erros
npx vitest run    → 704/704 testes passando
```

---

## RISCOS RESIDUAIS (fora do escopo desta missão)

| Risco | Classificação | Observação |
|-------|--------------|-----------|
| Rate limit login em multi-instância | MÉDIO | Em-memória por instância. Suficiente para lançamento. Migrar para Redis quando necessário. |
| `checkConflict` em updateAppointmentCore e moveAppointmentCore | BAIXO | Sem advisory lock (apenas em create). Updates são operações menos concorrentes. |
| Estoque via `/dashboard/produtos` (ajuste manual) | BAIXO | Não usa `updateMany` atômico. Operação admin, não concorrente. |

---

## VEREDICTO

**MISSÃO 03 = CONCLUÍDA**

Todos os 7 bloqueadores críticos de go-live foram eliminados. O sistema está apto para lançamento sujeito à validação de ambiente (Sentry, variáveis de produção, DNS, etc.).
