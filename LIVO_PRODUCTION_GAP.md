# LIVO — PRODUCTION GAP REPORT

Data: 09/06/2026
Fonte: LIVO_FUNCTIONAL_AUDIT.md

---

# DEFINIÇÃO DE PRIORIDADE

**P1** — Bloqueia uso real de uma barbearia hoje
**P2** — Limita significativamente a operação
**P3** — Melhoria importante para crescimento
**P4** — Nice to have / diferencial competitivo

---

# GAPS CRÍTICOS — P1

Sem esses itens, parte do fluxo principal falha.

---

## GAP-01 — Edição de agendamento

**Módulo:** Agenda
**Impacto:** Sem edição de horário/serviço/profissional, barbeiro precisa cancelar e recriar todo agendamento para qualquer ajuste.
**Arquivos afetados:** `agenda-actions.ts`, `agenda-board.tsx`

O que falta:
- Server action `updateAppointment(id, { date, serviceId, professionalId, notes })`
- Modal/drawer de edição no agenda board
- Re-cálculo de slot disponível ao editar

---

## GAP-02 — Edição completa de cliente

**Módulo:** Clientes
**Impacto:** Somente notas e bloqueio são editáveis. Não é possível corrigir nome, telefone, email, CPF ou endereço após criação.
**Arquivos afetados:** `clients/actions.ts`, `clients-client.tsx`

O que falta:
- Server action `updateClient(id, data)` com campos completos
- Formulário de edição no drawer/modal do cliente

---

## GAP-03 — Gestão de profissionais

**Módulo:** Profissionais
**Status: ⚠️ EM ANDAMENTO — 75% concluído**
**Impacto original:** Sem página dedicada. Impossível editar nome, bio ou desativar profissional.

### ✅ Concluído (Etapas 1–3 — 09/06/2026)

**Etapa 1 — `actions.ts`:**
- `getProfessionalsData()` — lista com membership.user + _count
- `createProfessional(name, bio)` — cria profissional independente de convite
- `updateProfessional(id, name, bio)` — edição com ownership check
- `toggleProfessionalActive(id, confirmDeactivate?)` — soft delete seguro com verificação de agendamentos futuros

**Etapa 2 — `page.tsx` + `loading.tsx`:**
- Server Component com header + skeleton loader (4 SkeletonRows)
- Título "Profissionais", descrição, ícone Scissors

**Etapa 3 — `profissionais-client.tsx`:**
- Lista de profissionais com avatar (OAuth image ou iniciais), badge Ativo/Inativo, stats (_count)
- Vínculo de usuário exibido por profissional (ou "Sem vínculo de acesso")
- Modal criar/editar (nome + bio com contador 500 chars)
- Toggle ativo/inativo com dois fluxos:
  - Desativar sem agendamentos futuros → imediato
  - Desativar com agendamentos futuros → `ConfirmDeactivateModal` com contagem
- Toast de feedback (success/error, 4s)
- `refreshData()` pós-ação sem reload de página
- Biome ✅ + TypeScript ✅

### ⏳ Pendente (Etapa 4)

- Adicionar item "Profissionais" com ícone `Scissors` no `NAV_ITEMS` do `dashboard-layout-client.tsx`
- Restrito a role `["owner"]`
- 1 linha de mudança no arquivo

### O que permanece fora do escopo deste GAP

- Vinculação de serviços por profissional (GAP futuro)
- Upload de avatar (GAP-06)
- Horários individuais (GAP-08)

---

## GAP-04 — PaymentMethod enum drift (bug potencial)

**Módulo:** Comandas
**Impacto:** Fechar comanda com métodos `cortesia`, `convenio` ou `outros` pode causar erro de constraint no PostgreSQL se o enum no banco não foi atualizado.
**Arquivos afetados:** `comandas/actions.ts`, DB schema

O que falta:
- Migration: `ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'cortesia';` (idem convenio, outros)
- Verificar se enum no banco já contém esses valores antes de disponibilizar na UI

---

# GAPS IMPORTANTES — P2

Sem esses itens, a experiência é significativamente degradada.

---

## GAP-05 — Recuperação de senha

**Módulo:** Login
**Impacto:** Usuário que esquece a senha não consegue acessar a conta.

O que falta:
- Fluxo "esqueci minha senha" com email de reset
- Token de reset com expiração
- Tela de nova senha

---

## GAP-06 — Upload de imagens

**Módulo:** Settings, Profissionais, Serviços
**Impacto:** Sem logo, sem avatares, sem fotos — produto parece incompleto para o usuário final.

O que falta:
- Integração com storage (S3/Cloudflare R2/Vercel Blob)
- Logo da barbearia (Settings)
- Avatar do owner (Settings)
- Foto de perfil de profissional (Professional.avatarUrl — campo existe, upload não)

---

## GAP-07 — Página dedicada de serviços

**Módulo:** Serviços
**Impacto:** Gestão de serviços escondida dentro de Settings → accordion. Difícil de descobrir para novos usuários.

O que falta:
- Página `/dashboard/servicos/` com lista + CRUD
- Mover services-manager.tsx para módulo próprio

---

## GAP-08 — Horários individuais por profissional

**Módulo:** Agenda, Profissionais
**Impacto:** Todos os profissionais seguem os mesmos horários da barbearia. Barbeiro meio período não tem como configurar disponibilidade diferente.

O que falta:
- Modelo `ProfessionalSchedule` ou extensão do `BusinessHour` por profissional
- UI de configuração por membro

---

## GAP-09 — Cancelamento de agendamento pelo cliente

**Módulo:** Página Pública
**Impacto:** Cliente não consegue cancelar sem ligar para a barbearia.

O que falta:
- Endpoint de cancelamento via token único no email de confirmação
- Ou link de cancelamento autenticado por telefone

---

## GAP-10 — Fluxo pós-suspensão claro

**Módulo:** Assinaturas
**Impacto:** Conta suspensa redireciona para /assinar mas sem instrução clara de como reativar (PIX expirado, precisa gerar novo).

O que falta:
- Página de status para conta suspensa
- Instrução passo-a-passo de reativação
- E-mail automático de aviso pré-suspensão

---

## GAP-11 — E-mail de aviso de fim de trial

**Módulo:** Assinaturas
**Impacto:** Usuário no trial não recebe aviso antes de expirar — chega em suspended sem contexto.

O que falta:
- Job/cron que dispara email 7 dias antes do trial expirar
- E-mail 1 dia antes
- Notificação in-app no banner

---

## GAP-12 — Histórico de movimentações de estoque

**Módulo:** Produtos & Estoque
**Impacto:** `StockMovement` registra tudo no banco mas não existe UI para visualizar o histórico por produto.

O que falta:
- Página ou drawer com histórico de movimentações
- Filtros por produto, tipo de movimento, período

---

## GAP-13 — Export de relatórios

**Módulo:** Relatórios
**Impacto:** Contador/barbeiro não consegue exportar dados para planilha ou PDF.

O que falta:
- Export CSV para todos os grids
- Export PDF para relatório do período

---

# GAPS DE CRESCIMENTO — P3

Importantes para escala e diferencial competitivo.

---

## GAP-14 — Alertas de estoque baixo

**Módulo:** Produtos & Estoque
**Campo:** `minStockAlert` existe no schema, lógica de alerta não implementada

O que falta:
- Badge visual na listagem quando `stockQuantity <= minStockAlert`
- Notificação no dashboard
- E-mail/WhatsApp de alerta

---

## GAP-15 — Notificação e lembrete para clientes

**Módulo:** Agenda
**Impacto:** Sem lembrete, taxa de no-show tende a ser alta

O que falta:
- WhatsApp via Z-API ou Twilio para lembrete 24h antes
- SMS fallback

---

## GAP-16 — WhatsApp no marketing

**Módulo:** Marketing
**Impacto:** Listas de sumidos e aniversariantes existem mas contato é manual (copiar telefone)

O que falta:
- Integração WhatsApp para envio em massa
- Templates personalizáveis por segmento

---

## GAP-17 — Multi-serviço por agendamento

**Módulo:** Agenda, Serviços
**Schema:** `AppointmentService` existe mas tabela não no DB

O que falta:
- Migration para `appointment_services`
- UI de seleção múltipla de serviços no form de agendamento
- Cálculo de duração total (soma de todos os serviços)

---

## GAP-18 — Múltiplos pagamentos por comanda

**Módulo:** Comandas
**Schema:** `ComandaPayment` existe mas tabela não no DB

O que falta:
- Migration para `comanda_payments`
- UI de split de pagamento no fechamento (ex: R$50 dinheiro + R$50 PIX)
- Relatório por forma de pagamento considerando splits

---

## GAP-19 — Memória persistente da Lívia

**Módulo:** Lívia
**Impacto:** Toda sessão começa do zero — nenhuma personalização possível

O que falta:
- Tabela de histórico de conversas
- Tool calls para dados reais do banco (faturamento, clientes, agenda)
- Sistema de memória entre sessões

---

## GAP-20 — Observabilidade

**Módulo:** Infraestrutura
**Impacto:** Erros em produção são invisíveis (sem Sentry, sem Logger)

O que falta:
- Sentry para captura de exceções
- Logger estruturado (Pino ou similar)
- Alertas por e-mail/Slack em erros críticos

---

# GAPS DIFERENCIADORES — P4

---

## GAP-21 — SEO da página pública

**Módulo:** Página Pública

O que falta:
- Meta tags dinâmicas por barbearia (og:title, og:description, og:image)
- Schema.org markup para local business
- Sitemap dinâmico

---

## GAP-22 — Booking com autenticação de cliente

**Módulo:** Página Pública

O que falta:
- Login/registro simples por telefone (OTP SMS)
- Histórico de agendamentos para clientes recorrentes
- Cancelamento self-service

---

## GAP-23 — Audit log

**Módulo:** Infraestrutura

O que falta:
- Tabela `AuditLog` com userId, action, entityType, entityId, diff
- Registro de todas as operações críticas (fechar comanda, alterar plano, etc.)

---

## GAP-24 — Testes automatizados

**Módulo:** Infraestrutura
**Contexto:** Zero testes hoje — qualquer mudança pode quebrar sem aviso

O que falta:
- Testes de integração para fluxos críticos (auth, onboarding, billing webhook)
- Testes unitários para `permissions.ts` e `availability.ts`
- CI/CD com GitHub Actions

---

## GAP-25 — Rate limiting geral

**Módulo:** Segurança
**Contexto:** Rate limit só existe para `/api/livia`. Login, booking público, onboarding — sem proteção.

O que falta:
- Rate limiting no `/api/auth` (login brute force)
- Rate limiting no booking público
- Considerar Redis/Upstash para rate limiting distribuído

---

# PRIORIZAÇÃO RESUMIDA

## Sprint P1 — Estabilização Funcional (2 semanas)

| # | Item | Módulo |
|---|------|--------|
| 1 | GAP-01: Edição de agendamento | Agenda |
| 2 | GAP-02: Edição completa de cliente | Clientes |
| 3 | GAP-03: Página de profissionais | Profissionais |
| 4 | GAP-04: PaymentMethod enum migration | Comandas |
| 5 | GAP-05: Recuperação de senha | Auth |

## Sprint P2 — Produto Completo (3 semanas)

| # | Item | Módulo |
|---|------|--------|
| 6 | GAP-06: Upload de imagens | Settings |
| 7 | GAP-07: Página de serviços | Serviços |
| 8 | GAP-10: Fluxo pós-suspensão | Billing |
| 9 | GAP-11: E-mail fim de trial | Billing |
| 10 | GAP-12: Histórico de estoque | Estoque |
| 11 | GAP-13: Export de relatórios | Relatórios |

## Sprint P3 — Engajamento e Retenção (4 semanas)

| # | Item | Módulo |
|---|------|--------|
| 12 | GAP-14: Alertas de estoque | Estoque |
| 13 | GAP-15: Lembretes WhatsApp | Agenda |
| 14 | GAP-16: WhatsApp marketing | Marketing |
| 15 | GAP-17: Multi-serviço | Agenda |
| 16 | GAP-18: Multi-pagamento | Comandas |
| 17 | GAP-19: Lívia com dados reais | IA |
| 18 | GAP-20: Observabilidade | Infra |

## Sprint P4 — Diferenciação (roadmap futuro)

GAP-21 a GAP-25

---

# SCORE DE PRONTIDÃO PARA PRODUÇÃO

| Dimensão | Score Atual | Score Pós-P1 | Score Pós-P2 |
|-----------|-------------|-------------|-------------|
| Funcionalidade | 7.3/10 | 8.5/10 | 9.2/10 |
| UX | 6.0/10 | 7.0/10 | 8.0/10 |
| Segurança | 5.0/10 | 6.0/10 | 7.0/10 |
| Engenharia | 6.0/10 | 6.5/10 | 7.5/10 |
| **Geral** | **6.1/10** | **7.0/10** | **7.9/10** |

---

# CONCLUSÃO

O LIVO hoje está operacional para o fluxo principal de uma barbearia real.

O maior gap funcional é a **impossibilidade de editar agendamentos e clientes** — ambos são ações cotidianas que barbeiros precisam fazer dezenas de vezes por dia.

O segundo maior gap é a **ausência de uma tela de gestão de profissionais** — a entidade mais importante do sistema não tem página própria.

Resolvendo os 5 GAPs do P1, o produto sobe de 7.3 → 8.5 em funcionalidade e está pronto para aquisição agressiva de clientes.
