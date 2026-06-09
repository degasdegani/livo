# LIVO TECH DEBT

Last Updated: 09/06/2026

---

# CRÍTICA

## TD-001 ✅ RESOLVIDO 09/06/2026

Role hardcoded

Arquivo:
layout.tsx → refatorado para Server Component
dashboard-layout-client.tsx → novo Client Component

Impacto:
RBAC visual corrigido — role real buscado do banco

Prioridade:
P0

---

## TD-002 ✅ RESOLVIDO 09/06/2026

Debug routes

Arquivos removidos:
- api/auth-test/route.ts
- api/auth-test-2/route.ts
- api/env-test/route.ts
- api/test-env/route.ts

Impacto:
Risco de exposição de secrets eliminado

Prioridade:
P0

---

# ALTA

## TD-003

Sem testes

Impacto:
Regressões invisíveis

Prioridade:
P2

---

## TD-004

Sem rate limiting

Impacto:
Custos IA

Prioridade:
P0

---

## TD-005

planStatus String

Impacto:
Billing

Prioridade:
P0

---

## TD-006

Sem observabilidade

Impacto:
Erros invisíveis

Prioridade:
P2

---

## TD-007

Sem audit log

Impacto:
Sem rastreabilidade

Prioridade:
P2

---

# MÉDIA

## TD-008

Dois sistemas de tokens

---

## TD-009

LiviaBubble fora do Design System

---

## TD-010

Onboarding fora do Design System

---

## TD-011

Deduplicação por nome

---

## TD-012

Campo legado paymentMethod

---

# BAIXA

## TD-013

Fonte Satoshi

---

## TD-014

Typos em documentos

---

## TD-015

Sem Swagger

---

## TD-016

Sem versionamento de API
