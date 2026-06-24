# LIVO ROADMAP

Version: 2026

---

# FASE 1

ESTABILIZAÇÃO

Objetivo:
Eliminar riscos críticos.

## P0 ✅ CONCLUÍDO 09/06/2026

[x] Corrigir role hardcoded

[x] Remover debug routes

[x] Rate limiting da Lívia

[x] planStatus → Enum

[x] Índices do banco

[x] Atualizar documentação (auditoria funcional + gap report)

---

# FASE 2

POLIMENTO

Objetivo:
Produto pronto para crescimento.

## P1

[ ] Unificar Design System

[ ] Fonte Satoshi

[ ] CRUD Serviços

[~] CRUD Profissionais ← 75% — Etapas 1–3 concluídas, Etapa 4 (nav) pendente

[ ] Horários de funcionamento

[ ] Edição de agendamento (GAP-01)

[ ] Edição completa de cliente (GAP-02)

[ ] PaymentMethod enum migration (GAP-04)

[ ] Recuperação de senha (GAP-05)

[ ] Cancelamento de agendamento

[ ] Persistência da Lívia

[ ] Upload de imagens

---

# FASE 3

ROBUSTEZ

Objetivo:
Engenharia profissional.

## P2

[ ] Testes

[ ] Sentry

[ ] Logger

[ ] CI/CD

[ ] Audit Log

[ ] Consolidar tokens

[ ] Booking público

---

# FASE 4

INTELIGÊNCIA

Objetivo:
Transformar o LIVO em plataforma.

## P3

[ ] Event Layer

[ ] Analytics Layer

[ ] Knowledge Graph

[ ] Memory Layer

[ ] Automation Layer

[ ] WhatsApp Assistant

---

# FASE 5

EXPANSÃO

Objetivo:
Multi-vertical.

## P4

[ ] LIVO Beauty

[ ] LIVO Med

[ ] LIVO Pet

[ ] LIVO Fit

[ ] Marketplace

---

## SPRINT 23/06/2026 — CORREÇÕES + FEATURES

### Concluído

[x] fix: birthDate UTC shift (-1 dia) — date-only.ts
[x] feat: DatePicker custom (Dia/Mês/Ano)
[x] fix: badge e resumo de comissões específicas por item

### Em implementação (ordem definida)

[ ] WhatsApp Alerts — 3 fluxos (confirmação, lembrete 3h, no-show)
[ ] Ranking TV em tempo real — /tv/[token], BarbershopGoal, ProfessionalGoal
[ ] Pacotes/Combos — Package, PackageItem
[ ] Planos de Assinatura — modelo Link Externo v1, ClientPlan, ClientSubscription
