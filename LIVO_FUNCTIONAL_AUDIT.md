# LIVO — AUDITORIA FUNCIONAL COMPLETA

Data: 09/06/2026
Auditor: CTO Orchestrator
Escopo: 15 módulos — o que funciona para uma barbearia real hoje

---

# LEGENDA

✅ FUNCIONA — pronto para uso real
⚠️ PARCIAL — funciona com limitações relevantes
❌ NÃO FUNCIONA — quebrado ou ausente

---

# RESULTADO GERAL

| Módulo              | Status   | Score |
|---------------------|----------|-------|
| Cadastro            | ✅       | 10/10 |
| Login               | ✅       | 10/10 |
| Onboarding          | ✅       | 9/10  |
| Dashboard           | ✅       | 8/10  |
| Agenda              | ⚠️       | 6/10  |
| Clientes            | ⚠️       | 7/10  |
| Profissionais       | ⚠️       | 6/10  |
| Serviços            | ⚠️       | 5/10  |
| Comandas            | ✅       | 9/10  |
| Produtos & Estoque  | ✅       | 8/10  |
| Relatórios          | ✅       | 8/10  |
| Comissões           | ✅       | 9/10  |
| Assinaturas         | ✅       | 8/10  |
| Página Pública      | ⚠️       | 6/10  |
| Marketing           | ✅       | 7/10  |
| Convites            | ✅       | 8/10  |
| Settings            | ⚠️       | 6/10  |
| Lívia               | ⚠️       | 5/10  |

**Score Funcional Médio: 7.5/10** ← atualizado após GAP-03 Etapas 1–3

---

# MÓDULO 1 — CADASTRO

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/register/actions.ts`
- `src/auth.ts`

## O que funciona
- Registro por email + senha (bcrypt 12 rounds)
- Google OAuth (PKCE + state)
- E-mail de boas-vindas via Resend
- Auto-login após registro
- Redirect para /onboarding

## Bugs encontrados
Nenhum.

## O que falta para produção
- Verificação de email (emailVerified existe no schema mas não é obrigatório)
- Recuperação de senha (não implementada)

---

# MÓDULO 2 — LOGIN

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(auth)/login/page.tsx`
- `src/auth.ts`
- `middleware.ts`

## O que funciona
- Login por email + senha
- Login com Google OAuth (PKCE + state — P0.2)
- JWT strategy
- Redirect pós-login para /dashboard
- Middleware protege todas as rotas /dashboard e /onboarding

## Bugs encontrados
Nenhum.

## O que falta para produção
- "Esqueci minha senha" (não implementado)
- Limite de tentativas de login (rate limit não existe para login, apenas para Lívia)

---

# MÓDULO 3 — ONBOARDING

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(onboarding)/onboarding/actions.ts`

## O que funciona
- Passo 1: dados pessoais do proprietário (nome, CPF, nascimento, telefone)
- Passo 2: dados da barbearia (nome, telefone, endereço, slug)
- ViaCEP: preenchimento automático de endereço por CEP
- Slug auto-gerado a partir do nome + verificação de unicidade
- Criação automática: barbearia + profissional + membership + 6 serviços padrão + 7 horários padrão
- Trial 30 dias (60 dias para leads da waitlist TX)
- Redirect para /dashboard após conclusão

## Bugs encontrados
- `trialEndsAt` calculado como `now() + 30d` sem considerar fuso horário — data pode estar 1 dia errada em alguns fusos

## O que falta para produção
- Upload de logo da barbearia no onboarding
- Validação de CPF (campo aceita qualquer string)

---

# MÓDULO 4 — DASHBOARD

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/actions.ts`

## O que funciona
- KPIs: agendamentos hoje, receita hoje (via comandas), novos clientes do mês, agendamentos pendentes
- Agenda do dia com botões de ação rápida (confirmar, concluir, no-show)
- Gráfico de evolução mensal de receita (Recharts)
- Ranking de barbeiros (apenas owner)
- Comissões do mês (view do barbeiro)
- Totalmente role-based: owner/reception/barber veem dados diferentes

## Bugs encontrados
- Deduplicação de clientes únicos por `clientName` (string, case insensitive) — pode supercontar se mesmo cliente digitar nome diferente

## O que falta para produção
- Alertas de estoque baixo
- Próximos agendamentos do dia seguinte
- Notificação de pagamento pendente

---

# MÓDULO 5 — AGENDA

**Status: ⚠️ FUNCIONA PARCIALMENTE**

## Arquivos
- `src/app/(dashboard)/dashboard/agenda/page.tsx`
- `src/app/(dashboard)/dashboard/agenda/agenda-actions.ts`
- `src/app/(dashboard)/dashboard/agenda/agenda-board.tsx`
- `src/app/(dashboard)/dashboard/agenda/new/page.tsx`
- `src/app/(dashboard)/dashboard/agenda/new/actions.ts`
- `src/app/(dashboard)/dashboard/agenda/new/new-appointment-form.tsx`
- `src/app/(dashboard)/dashboard/agenda/appointment-actions.tsx`

## O que funciona
- Visualização mensal, semanal e diária
- Criação de agendamento manual (cliente novo ou existente do CRM)
- Cliente auto-criado no CRM se não existe (por telefone)
- Atualização de status: pending → confirmed → completed / no_show / cancelled
- Mover agendamento entre barbeiros (owner/reception only)
- Quick appointment via agenda board
- Cálculo de slots disponíveis por horário de funcionamento
- Role-based: barbeiro vê apenas seus agendamentos

## Bugs encontrados
- `createdVia AppointmentOrigin` no schema usa enum não criado no DB — coluna provavelmente existe como String, funcionando na prática mas sem constraint de banco
- `AppointmentService` model em schema.prisma, tabela `appointment_services` NÃO existe no DB — se qualquer código usar `include: { appointmentServices: true }` a query vai falhar (atualmente sem uso, seguro)

## O que falta para produção
- **CRÍTICO**: Edição de agendamento existente (mudar horário, serviço, profissional) — não existe nenhuma action de update
- Cancelamento com notificação ao cliente
- Múltiplos serviços por agendamento (AppointmentService — WIP, tabela não no DB)
- Notificação/lembrete para cliente (SMS/WhatsApp)
- Recorrência de agendamentos

---

# MÓDULO 6 — CLIENTES

**Status: ⚠️ FUNCIONA PARCIALMENTE**

## Arquivos
- `src/app/(dashboard)/dashboard/clients/page.tsx`
- `src/app/(dashboard)/dashboard/clients/actions.ts`
- `src/app/(dashboard)/dashboard/clients/clients-client.tsx`

## O que funciona
- Listagem com filtros: busca (nome/telefone), origem, sumidos há X dias, aniversariantes do mês, só bloqueados
- Criar cliente (nome, telefone obrigatórios)
- Atualizar notas do cliente
- Bloquear/desbloquear cliente
- Stats: total, bloqueados, aniversariantes
- Histórico: totalVisits e lastVisitAt (atualizados automaticamente via agendamento/booking)
- Role-based: barbeiro vê apenas seus clientes

## Bugs encontrados
- Edição completa de cliente não encontrada em actions.ts (apenas `updateClientNotes` e `toggleClientBlock`)
- Deduplicação por (phone, barbershopId) no banco — mas se mesmo cliente cadastrado com telefones diferentes, gera duplicatas

## O que falta para produção
- **IMPORTANTE**: Edição completa (nome, telefone, email, CPF, endereço, data de nascimento)
- Deleção de cliente
- Merge de clientes duplicados
- Import por planilha
- Histórico de comandas por cliente (cliente detalhe com lista de atendimentos)

---

# MÓDULO 7 — PROFISSIONAIS

**Status: ⚠️ FUNCIONA PARCIALMENTE** ← em finalização (GAP-03 75%)

## Arquivos
- `src/app/(dashboard)/dashboard/profissionais/actions.ts` ✅ CRIADO (GAP-03 Etapa 1)
- `src/app/(dashboard)/dashboard/profissionais/page.tsx` ✅ CRIADO (GAP-03 Etapa 2)
- `src/app/(dashboard)/dashboard/profissionais/loading.tsx` ✅ CRIADO (GAP-03 Etapa 2)
- `src/app/(dashboard)/dashboard/profissionais/profissionais-client.tsx` ✅ CRIADO (GAP-03 Etapa 3)
- `src/app/(dashboard)/dashboard/settings/acessos/page.tsx` (convites + membros)
- `src/app/convite/[token]/page.tsx` (accept invite → cria professional + membership)

## O que funciona
- Owner criado como profissional no onboarding
- Novos profissionais via sistema de convites
- Configuração de comissões na criação (serviços % + produtos %)
- Professional visível em agenda, comandas e relatórios
- ✅ NOVO: Listagem completa na página `/dashboard/profissionais/`
- ✅ NOVO: Criar profissional diretamente (sem depender de convite)
- ✅ NOVO: Editar nome e bio de profissional
- ✅ NOVO: Toggle ativo/inativo com verificação de agendamentos futuros
- ✅ NOVO: Modal de confirmação quando há agendamentos futuros ao desativar

## Pendências imediatas
- ⏳ Navegação: item "Profissionais" ainda não aparece no sidebar (GAP-03 Etapa 4)

## Bugs encontrados
- `avatarUrl` existe no schema mas nenhum upload implementado
- Profissional sem vínculo de usuário pode ser criado mas não terá acesso ao sistema

## O que falta para produção
- Navegação sidebar (Etapa 4 — próximo passo)
- Upload de avatar de profissional (GAP-06)
- Horários individuais por profissional (GAP-08)
- Serviços por profissional (qual profissional faz qual serviço)

---

# MÓDULO 8 — SERVIÇOS

**Status: ⚠️ FUNCIONA PARCIALMENTE**

## Arquivos
- `src/app/(dashboard)/dashboard/settings/services-manager.tsx`
- `src/app/(dashboard)/dashboard/settings/actions.ts`

## O que funciona
- CRUD completo via accordion em Settings
- Campos: nome, descrição, duração (min), preço
- Toggle isActive
- 6 serviços padrão criados no onboarding

## Bugs encontrados
- Sem página dedicada `/servicos/`
- Múltiplos serviços por agendamento não implementado (`AppointmentService` não no DB)

## O que falta para produção
- Página dedicada de gestão de serviços
- Categorias de serviços
- Imagem por serviço
- Serviços por profissional (restrição de quem pode fazer o quê)
- Múltiplos serviços por agendamento

---

# MÓDULO 9 — COMANDAS

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/comandas/page.tsx`
- `src/app/(dashboard)/dashboard/comandas/actions.ts`
- `src/app/(dashboard)/dashboard/comandas/nova/nova-comanda-form.tsx`
- `src/app/(dashboard)/dashboard/comandas/[id]/comanda-pdv.tsx`

## O que funciona
- Abertura de comanda (profissional + cliente opcional)
- PDV: adicionar serviços e produtos
- Validação de estoque antes de adicionar produto
- Remoção de itens
- Fechamento: calcula comissões, baixa estoque, registra movimento, salva método de pagamento
- Cancelamento: restaura estoque (se comanda estava fechada), owner only
- Filtros: abertas/hoje/fechadas/todas
- Role-based: barbeiro vê apenas suas comandas
- Desconto total via `discountInCents` no fechamento
- 8 métodos de pagamento: cash/pix/credit_card/debit_card/voucher/cortesia/convenio/outros

## Bugs encontrados
- **POTENCIAL**: `cortesia/convenio/outros` são valores novos do enum `PaymentMethod` em schema.prisma — se o tipo enum no DB não foi atualizado, usar esses métodos no fechamento causaria erro de constraint PostgreSQL
- `ComandaPayment` model no schema, tabela NÃO no DB — não é bug ativo pois código usa campo `paymentMethod` single (legado), mas futura implementação de pagamento split quebrará
- `serviceDiscountInCents`/`productDiscountInCents` no schema, NÃO no DB — campos de schema-ahead, sem uso no código atual
- TD-012: Coexistência de `paymentMethod` (String único) e `ComandaPayment` (multi-pagamento) cria ambiguidade arquitetural

## O que falta para produção
- Verificar se enum PaymentMethod no DB inclui cortesia/convenio/outros (migration necessária)
- Multi-pagamento split (ComandaPayment) — WIP no schema
- Desconto por tipo (serviço vs produto) — WIP no schema
- Reimpressão de comanda / recibo
- Comanda vinculada a agendamento (campo existe, fluxo parcialmente implementado)

---

# MÓDULO 10 — PRODUTOS & ESTOQUE

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/produtos/page.tsx`
- `src/app/(dashboard)/dashboard/produtos/actions.ts`

## O que funciona
- CRUD de produtos: nome, descrição, custo, preço, estoque, alerta mínimo, categoria
- Categorias de produtos (CRUD)
- Toggle isActive
- Ajuste manual de estoque (StockMovement com razão)
- Decremento automático de estoque ao fechar comanda
- Restore de estoque ao cancelar comanda
- `StockMovement` com razões: purchase/comanda_use/manual_adjustment/loss/return

## Bugs encontrados
Nenhum crítico.

## O que falta para produção
- Visualização do histórico de movimentações por produto
- Alerta visual/notificação de estoque baixo
- Relatório de estoque (inventário atual)
- Import de produtos por planilha

---

# MÓDULO 11 — RELATÓRIOS

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/relatorios/page.tsx`
- `src/app/(dashboard)/dashboard/relatorios/actions.ts`

## O que funciona
- Filtro de período: semana atual, mês atual, mês anterior, ano
- KPIs: faturamento total, total de comandas, ticket médio, clientes únicos
- Breakdown por método de pagamento
- Top 10 serviços (quantidade + receita)
- Top 5 produtos (quantidade + receita)
- Ranking de barbeiros (faturamento + comissões) — owner only
- Evolução diária (≤31 dias) ou mensal (ano) — pronto para gráfico

## Bugs encontrados
- Clientes únicos calculado por `clientName.toLowerCase().trim()` — pode duplicar se nome digitado diferente
- Apenas comandas fechadas são contabilizadas — comportamento correto mas pode confundir expectativas

## O que falta para produção
- Export CSV/PDF
- Filtro por data customizada (range picker)
- Acesso para barbeiro (hoje bloqueado por `requireRole(["owner", "reception"])`)
- Relatório de estoque (inventário)
- Relatório de agendamentos (taxa de no-show, cancelamentos)

---

# MÓDULO 12 — COMISSÕES

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/comissoes/page.tsx`
- Lógica em: `src/app/(dashboard)/dashboard/comandas/actions.ts` (getComissoesData)

## O que funciona
- Comissão calculada automaticamente ao fechar comanda (por item)
- Taxa separada para serviços e produtos por membership
- Períodos: mês atual, mês anterior, últimos 30, últimos 90 dias
- Resumo por profissional: total comandas, faturamento, comissão serviços, comissão produtos
- Barbeiro vê apenas suas próprias comissões
- Owner vê todos os profissionais com filtro

## Bugs encontrados
- Comissão não recalculada se desconto aplicado no fechamento — `totalInCents` é atualizado mas `commissionValue` por item reflete preço original
- Comissão só existe para comandas com `commissionPct` configurado no membership — sem config = sem comissão, comportamento esperado mas pode surpreender

## O que falta para produção
- Relatório de comissões exportável
- Fechamento de período de comissão (marcar como "pago")
- Histórico de pagamentos de comissão

---

# MÓDULO 13 — ASSINATURAS

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/assinar/page.tsx`
- `src/app/(dashboard)/dashboard/assinar/actions.ts`
- `src/app/api/webhooks/asaas/route.ts`
- `src/lib/permissions.ts`

## O que funciona
- Detecção de status: trial (com countdown), active, suspended, lifetime
- Toggle PIX mensal/anual com QR code real via Asaas
- Webhook processa: CONFIRMED → active, OVERDUE/CANCELLED → suspended, outras → cancelled
- Proteção lifetime: `planStatus: { not: PlanStatus.lifetime }` no webhook (P0.4)
- Middleware de acesso bloqueia suspended/cancelled com redirect para /assinar
- Preços: R$197/mês ou R$167/mês (anual = R$2.004/ano)

## Bugs encontrados
- Sem página de status para conta suspensa (usuário fica preso em /assinar sem informação clara)
- Asaas subscription ID não verificado antes de criar novo — possível criação de assinatura duplicada se usuário clicar duas vezes

## O que falta para produção
- Cartão de crédito como método de pagamento
- Histórico de faturas/pagamentos
- Downgrade de plano
- E-mail de aviso próximo do fim do trial
- Fluxo de reativação pós-suspensão com instrução clara

---

# MÓDULO 14 — PÁGINA PÚBLICA

**Status: ⚠️ FUNCIONA PARCIALMENTE**

## Arquivos
- `src/app/[slug]/page.tsx`
- `src/app/[slug]/book/actions.ts`
- `src/lib/availability.ts`

## O que funciona
- Página pública `/[slug]` com informações da barbearia
- Listagem de serviços e profissionais
- LiviaBubble para visitantes (sem autenticação)
- Cálculo de slots disponíveis (respeita horários e agendamentos existentes)
- Criação de agendamento público (sem login)
- Auto-criação de cliente no CRM via telefone
- E-mail de confirmação para o cliente (via Resend) se email fornecido

## Bugs encontrados
- Sem validação de telefone (qualquer string é aceita como phone)
- E-mail de confirmação pode falhar silenciosamente (try/catch engloba tudo)
- Sem validação de conflito de horário no lado do servidor antes do CREATE (race condition possível em agendamentos simultâneos)

## O que falta para produção
- Photos/galeria da barbearia
- Avaliações e reviews
- Mapa/localização integrado
- SEO (meta tags, Open Graph)
- Cancelamento de agendamento pelo cliente
- Design mais elaborado da página pública
- Rate limiting para o booking público (hoje sem proteção)

---

# MÓDULO 15 — MARKETING

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/marketing/page.tsx`
- `src/app/(dashboard)/dashboard/marketing/actions.ts`

## O que funciona
- Clientes sumidos: filtra clientes sem visita há 30/60/90 dias
- Aniversariantes do mês: query com EXTRACT(MONTH) no PostgreSQL
- Role-based: barbeiro vê apenas seus clientes (filtrado por appointments)
- Lista com telefone para contato manual

## Bugs encontrados
- Nenhum crítico

## O que falta para produção
- Envio de mensagem WhatsApp (hoje apenas exibe a lista — usuário precisa copiar manualmente)
- Segmentação por origem (Instagram, Google, etc.)
- Templates de mensagem personalizáveis
- Agendamento de campanhas
- Rastreamento de resultados

---

# MÓDULO 16 — CONVITES

**Status: ✅ FUNCIONA**

## Arquivos
- `src/app/(dashboard)/dashboard/settings/acessos/page.tsx`
- `src/app/(dashboard)/dashboard/settings/acessos/actions.ts`
- `src/app/(dashboard)/dashboard/settings/acessos/acessos-client.tsx`
- `src/app/convite/[token]/page.tsx`
- `src/app/convite/[token]/actions.ts`

## O que funciona
- Owner envia convite por email com role (reception | barber)
- Configuração de comissão pré-definida no convite
- Link válido por 7 dias
- Aceitar convite: conta existente (login) ou criar nova conta
- Professional + Membership criados automaticamente ao aceitar
- Expiração e revogação de convites

## Bugs encontrados
- Sem reenvio de convite expirado (usuário precisa criar novo)
- Sem notificação de convite expirado ao owner

## O que falta para produção
- Reenvio de convite
- Notificação por email quando convite for aceito
- Limite de convites por plano

---

# MÓDULO 17 — SETTINGS

**Status: ⚠️ FUNCIONA PARCIALMENTE**

## Arquivos
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/app/(dashboard)/dashboard/settings/settings-accordion.tsx`
- `src/app/(dashboard)/dashboard/settings/basic-info-form.tsx`
- `src/app/(dashboard)/dashboard/settings/business-hours-form.tsx`
- `src/app/(dashboard)/dashboard/settings/services-manager.tsx`
- `src/app/(dashboard)/dashboard/settings/personal-info-form.tsx`
- `src/app/(dashboard)/dashboard/settings/actions.ts`

## O que funciona
- Accordion: dados pessoais do owner (nome, CPF, nascimento, telefone)
- Accordion: informações da barbearia (nome, telefone, endereço)
- Accordion: horários de funcionamento (7 dias, isOpen + openTime + closeTime)
- Accordion: serviços (CRUD completo com duração e preço)
- Accordion: acessos (convites + membros ativos)

## Bugs encontrados
- Nenhum crítico nos acordeons implementados

## O que falta para produção
- **IMPORTANTE**: Upload de logo da barbearia (logoUrl não existe no schema)
- Upload de avatar do owner
- Fotos da barbearia (galeria)
- Configurações de notificações
- Configurações de plano (downgrade/cancelamento)
- Slug da barbearia (imutável após criação — sem UI para mudar mesmo que slug livre)

---

# MÓDULO 18 — LÍVIA (IA)

**Status: ⚠️ FUNCIONA (MVP)**

## Arquivos
- `src/components/livia-bubble.tsx`
- `src/app/api/livia/route.ts`

## O que funciona
- Bubble flutuante com animação pulse
- Chat com histórico na sessão atual
- Envio para `/api/livia` com barbershopId como contexto
- Claude AI como backend (Anthropic)
- Rate limiting: 20 req/min por userId (in-memory Map)
- Sugestões iniciais de perguntas
- Animação de "digitando"
- Funciona tanto no dashboard quanto na página pública

## Bugs encontrados
- Sem memória persistente — toda sessão começa do zero
- Rate limiter in-memory não funciona em múltiplas instâncias serverless
- Sem acesso a dados reais da barbearia (faturamento, clientes, etc.) — respostas são genéricas
- `barbershopId` passado como contexto mas sem query real ao banco

## O que falta para produção
- Acesso a dados reais via tool calls (faturamento, próximos agendamentos, clientes recentes)
- Persistência de conversas no banco
- Memory Layer (contexto entre sessões)
- Ações: "agende para mim", "crie um cliente"
- Rate limiter distribuído (Redis/Upstash)

---

# SCHEMA DRIFT — ANÁLISE DE SEGURANÇA

## Tabelas no schema.prisma mas NÃO no banco de dados

| Tabela                | Usado no código | Risco |
|-----------------------|-----------------|-------|
| `appointment_services`| ❌ Não          | Seguro — feature WIP |
| `comanda_payments`    | ❌ Não          | Seguro — código usa campo `paymentMethod` legado |

## Colunas no schema mas NÃO no banco de dados

| Campo                          | Usado no código | Risco |
|-------------------------------|-----------------|-------|
| `serviceDiscountInCents`       | ❌ Não          | Seguro — campo de schema-ahead |
| `productDiscountInCents`       | ❌ Não          | Seguro — campo de schema-ahead |

## Tipos/Enums no schema mas NÃO no banco de dados

| Enum              | Campo usando     | Risco |
|-------------------|-----------------|-------|
| `AppointmentOrigin`| `createdVia` (appointments) | Provavelmente coluna existe como String — seguro na prática |
| PaymentMethod novos valores (`cortesia/convenio/outros`) | `fecharComanda()` | **⚠️ POTENCIAL BUG** — se DB enum não tem esses valores, fechar comanda com esses métodos vai falhar |

## Ação necessária

Migration pendente para eliminar o drift:

```sql
-- 1. AppointmentOrigin enum
CREATE TYPE "AppointmentOrigin" AS ENUM ('reception', 'app', 'owner');
ALTER TABLE "appointments" ALTER COLUMN "createdVia" TYPE "AppointmentOrigin"
  USING "createdVia"::"AppointmentOrigin";

-- 2. PaymentMethod novos valores
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'cortesia';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'convenio';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'outros';

-- 3. appointment_services
CREATE TABLE "appointment_services" (...);

-- 4. comanda_payments
CREATE TABLE "comanda_payments" (...);

-- 5. Novas colunas em comandas
ALTER TABLE "comandas" ADD COLUMN IF NOT EXISTS "serviceDiscountInCents" INTEGER DEFAULT 0;
ALTER TABLE "comandas" ADD COLUMN IF NOT EXISTS "productDiscountInCents" INTEGER DEFAULT 0;
```

---

# RESUMO EXECUTIVO

## Módulos prontos para uso real imediato (9/18)
Cadastro, Login, Onboarding, Dashboard, Comandas, Produtos & Estoque, Relatórios, Comissões, Assinaturas, Convites, Marketing

## Módulos com limitações importantes mas usáveis (6/18)
Agenda (sem edição), Clientes (sem edição completa), Profissionais (sem página), Serviços (sem página), Página Pública (booking funciona), Settings (sem uploads), Lívia (MVP)

## Módulos ausentes
Não há módulos completamente quebrados. Todos funcionam no fluxo principal.

## Maior risco operacional hoje
1. **Edição de agendamento inexistente** — barbeiro não consegue reagendar horário sem cancelar e recriar
2. **Edição de cliente incompleta** — apenas notas e bloqueio editáveis
3. **Gestão de profissionais** — página criada, aguardando navegação sidebar (Etapa 4)
4. **PaymentMethod enum drift** — métodos cortesia/convenio/outros podem falhar no DB

## O sistema hoje suporta operação real?
**Sim.** Uma barbearia pode hoje usar o LIVO para: onboarding completo, agenda diária, CRM básico, PDV com comissões, estoque, relatórios financeiros e faturamento via PIX. As lacunas são reais mas não impedem a operação principal.

---

# MÓDULO 19 — COMBOS / PACOTES

**Status: ✅ FUNCIONA (26/06/2026)**

## Arquivos
- `src/app/(dashboard)/dashboard/combos/actions.ts`
- `src/app/(dashboard)/dashboard/combos/page.tsx`
- `src/app/(dashboard)/dashboard/combos/loading.tsx`
- `src/app/(dashboard)/dashboard/combos/combos-client.tsx`

## O que funciona
- CRUD completo: criar, editar, ativar/desativar combo
- Composição por serviços e produtos com quantidade
- Preço único com economia calculada vs avulso
- Comissão específica por combo (override da engine global)
- Agrupamento visual no PDV com badge "Combo"
- Camada de comissão: combo → override → global

---

# MÓDULO 20 — CLUBE DE ASSINATURA

**Status: ✅ FUNCIONA (26/06/2026) — feature flag por barbearia**

## Arquivos principais
- `src/lib/clube-flag.ts` — isClubEnabled, requireClubEnabled
- `src/lib/asaas-clube.ts` — createAsaasSubaccount, configureClubWebhook, cancelAsaasSubscription
- `src/lib/otp-clube.ts` — OTP geração, hash, rate limit, envio SMS
- `src/app/(dashboard)/dashboard/clube/` — gestão owner
- `src/app/(dashboard)/dashboard/clube/assinantes/` — dashboard MRR
- `src/app/[slug]/clube/` — área pública + login + fluxo assinatura
- `src/app/api/webhooks/asaas/clube/route.ts` — webhook isolado
- `src/components/ui/selo-asaas.tsx` — conformidade BaaS

## O que funciona
- Feature flag por barbearia (clubEnabled), sidebar com cadeado "Em breve"
- CRUD de planos: serviços com cota/mês, descontos por produto, comissão
- Conexão subconta Asaas com validação de CNPJ (dígitos verificadores)
- Webhook com ordenação de eventos (P1-A) e idempotência (VS-5)
- Login cliente por OTP: SHA-256, rate limit 3/h, expiração 10min, JWT 60 dias
- Área pública: planos + economia + fluxo assinar → login → checkout
- Área logada: saldo do ciclo, barra de progresso, cancelamento self-service
- PDV: serviços cobertos (R$0), decremento de cota, comissão em cascata
- Dashboard MRR com ativos, cancelamentos, uso do ciclo
- SeloAsaas em todas as telas de pagamento (conformidade BaaS Banco Central)

## Pendente antes do go-live
- Vars de ambiente no Vercel: ASAAS_CLUBE_WEBHOOK_TOKEN, NEXT_PUBLIC_APP_URL, ASAAS_WEBHOOK_EMAIL
- Integração provedor SMS nacional (hoje: console em dev, erro em prod)
- Aprovação final do formulário BaaS pelo Asaas
- Cláusula contratual Asaas nos Termos de Uso
- Smoke test completo com conta Vortex
- Ativar clubEnabled para primeiros 10 clientes pagantes
