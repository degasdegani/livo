# LIVO ARCHITECTURE DECISIONS

ADR Registry

---

ADR-001

Decisão:
Next.js App Router

Status:
Aceita

Motivo:
Arquitetura moderna baseada em Server Components.

---

ADR-002

Decisão:
Prisma como única camada de acesso ao banco

Status:
Aceita

Motivo:
Padronização e segurança.

---

ADR-003

Decisão:
JWT ao invés de sessões em banco

Status:
Aceita

Motivo:
Escalabilidade e simplicidade.

---

ADR-004

Decisão:
Multi-tenant por barbershopId

Status:
Aceita

Motivo:
Isolamento operacional simples.

Observação:
Documentação utiliza tenant_id.
Código utiliza barbershopId.

---

ADR-005

Decisão:
Server Actions para mutações

Status:
Aceita

Motivo:
Redução de APIs desnecessárias.

---

ADR-006

Decisão:
Anthropic Claude Haiku para Lívia

Status:
Aceita

Motivo:
Baixo custo e baixa latência.

---

ADR-007

Decisão:
Asaas como provedor de billing

Status:
Aceita

Motivo:
PIX nativo para mercado brasileiro.

---

ADR-008

Decisão:
Event Layer adiada

Status:
Planejada

Motivo:
Produto ainda em fase MVP.

Consequência:
Sem automações
Sem memória persistente
Sem analytics avançada

---

ADR-009

Decisão:
RBAC centralizado em permissions.ts

Status:
Aceita

Motivo:
Fonte única de autorização.

Observação:
Frontend atualmente possui bug de role hardcoded.

---

ADR-010

Decisão:
Vertical inicial = Barber

Status:
Aceita

Motivo:
Validação do framework antes da expansão.
