## CHANGELOG RECENTE

### 09/06/2026 — SPRINT P0 + AUDITORIA + GAP-03

**Sprint P0 — Estabilização de Segurança (todos resolvidos):**

- P0.1: Role `owner` hardcoded → substituído por `requireRole()` em todas as actions
- P0.2: Rotas de debug `/api/debug/*` removidas do codebase
- P0.3: Rate limiting adicionado em `/api/livia` (20 req/min por userId, in-memory Map)
- P0.4: `planStatus` adicionado como enum Prisma (`PlanStatus: trial, active, suspended, cancelled, lifetime`) com migration aplicada
- P0.5: Índices `@@index([barbershopId])` adicionados em 11 models (Professional, Service, Appointment, Client, Comanda, ComandaItem, Membership, Invitation, Product, StockMovement, BusinessHour)

**Auditoria Funcional Completa:**

- 18 módulos auditados — score médio 7.3/10
- `LIVO_FUNCTIONAL_AUDIT.md` criado (estado de cada módulo)
- `LIVO_PRODUCTION_GAP.md` criado (25 gaps priorizados P1→P4)

**GAP-03 — Página de Gestão de Profissionais (em andamento):**

Etapa 1 — `src/app/(dashboard)/dashboard/profissionais/actions.ts`:
- `getProfessionalsData()` — lista com membership.user + _count de appointments e comandas
- `createProfessional(name, bio?)` — cria profissional vinculado à barbearia
- `updateProfessional(id, name, bio?)` — edição com ownership check multi-tenant
- `toggleProfessionalActive(id, confirmDeactivate?)` — soft delete + verificação de agendamentos futuros
- `ToggleProfessionalResult` discriminated union: success | error | requiresConfirm

Etapa 2 — Server Component + Skeleton:
- `page.tsx`: header com ícone Scissors + metadata
- `loading.tsx`: 4 SkeletonRows (skeleton nativo do projeto)

Etapa 3 — `profissionais-client.tsx` (UI completa):
- Lista de profissionais: avatar (OAuth image ou iniciais), badge Ativo/Inativo, bio, linked user, stats
- Modal criar/editar: name + bio (contador 500 chars)
- Toggle flow: direto (sem agendamentos) ou via `ConfirmDeactivateModal` (com contagem de agendamentos futuros)
- Toast feedback 4s, `refreshData()` pós-ação, `togglingId` por linha

Etapa 4 — pendente: item "Profissionais" no sidebar (`dashboard-layout-client.tsx`)

**Decisão técnica registrada:**
- Hard delete de profissional bloqueado: `Appointment.professionalId` e `Comanda.professionalId` são FK NOT NULL sem CASCADE — apenas soft delete (isActive=false) é seguro
- TypeScript narrowing de `ToggleProfessionalResult` requer `"requiresConfirm" in result` e `"error" in result` como guardas positivas — negação após early return não propaga em closures assíncronas

---

## 4. BANCO DE DADOS — SCHEMA COMPLETO

Todos os models usam @@map() para snake_case na tabela. Campos individuais NÃO têm @map().

### Mapeamentos obrigatórios (apenas tabelas):

- User → @@map("users")
- Account → @@map("accounts")
- Session → @@map("sessions")
- VerificationToken → @@map("verification_tokens")
- Barbershop → @@map("barbershops")
- Professional → @@map("professionals")
- Service → @@map("services")
- Appointment → @@map("appointments")
- Client → @@map("clients")
- BusinessHour → @@map("business_hours")
- Membership → @@map("memberships")
- Invitation → @@map("invitations")
- WaitlistLead → @@map("waitlist_leads") ← CRÍTICO — NUNCA deletar
- ProductCategory → @@map("product_categories")
- Product → @@map("products")
- StockMovement → @@map("stock_movements")
- Comanda → @@map("comandas")
- ComandaItem → @@map("comanda_items")

### Enums:

```prisma
enum Plan { start, pro, prime }
enum AppointmentStatus { pending, confirmed, completed, cancelled, no_show }
enum MemberRole { owner, reception, barber }
enum InvitationStatus { pending, accepted, revoked, expired }
enum ClientOrigem { Indicacao, Google, Instagram, Fachada, Outro }
enum StockMovementReason { purchase, comanda_use, manual_adjustment, loss, return }
enum ComandaStatus { open, closed, cancelled }
enum PaymentMethod { cash, pix, credit_card, debit_card, voucher }
enum ComandaItemType { service, product }
```

---

## 5. RBAC E PERMISSÕES

### Arquivo: src/lib/permissions.ts

- getCurrentUser() — retorna usuário logado ou null
- getCurrentMembership() — busca crachá ativo no banco
- requireMembership() — exige crachá. Sem crachá → redirect("/login")
- requireRole(roles) — exige papel. Sem permissão → redirect("/dashboard")

---

## 6. REGRAS DE NEGÓCIO DOS ACESSOS

**OWNER:** acesso total.
**RECEPTION:** vê todos os clientes e agendamentos. NÃO acessa financeiro geral.
**BARBER:** escopo restrito ao próprio.

**Lívia (IA):** disponível no plano PRO como bubble. Plano PRIME terá página completa.

---

## 7. O QUE JÁ ESTÁ CONSTRUÍDO

### ✅ DIAS 1–9

Tudo conforme changelog anterior.

### ✅ DIA 10 — ACABAMENTO VISUAL

Zero migração. Zero dependências novas.

- src/components/ui/: skeleton, toast, badge, empty-state
- loading.tsx em todas as rotas do dashboard
- not-found.tsx — página 404 branded
- globals.css — animações + transições globais
- layout.tsx raiz — ToastProvider + favicon SVG
- layout.tsx dashboard — active state, mobile menu, dark/light toggle

### ✅ AJUSTES PÓS DIA 10

**Badge de plano dinâmico:**

- PLAN_LABELS e PLAN_COLORS em dashboard/page.tsx
- start=cinza, pro=vermelho, prime=dourado
- Script scripts/update-plan.ts para migrar barbearias de start→pro

**Logo SVG:**

- public/logo-livo.svg — LIVOTX com tspan (sem espaço entre letras)
- public/logo-icon.svg — ícone L quadrado vermelho
- public/favicon.svg — favicon L vermelho
- Registrado no layout.tsx raiz via metadata.icons

**Saudação com nome da barbearia:**

- getSaudacao() — bom dia/boa tarde/boa noite dinâmico
- Header e h1 usam barbershop.name em vez de session.user.name

**Menu lateral:**

- "Início" com ícone Home (era "Dashboard" com LayoutDashboard)
- Dark/Light toggle no rodapé da sidebar e no header mobile

### ✅ LÍVIA — IA ASSISTENTE (PRO)

**Arquivos criados:**

- src/app/api/livia/route.ts — endpoint POST, chama claude-haiku-4-5-20251001
- src/components/livia-bubble.tsx — chat bubble flutuante

**Funcionalidades:**

- Bubble circular com foto da Lívia, pulsando quando fechado
- Chat com animação de abertura, histórico de mensagens
- Animação "digitando" (3 dots bounce) enquanto aguarda resposta
- Sugestões clicáveis na tela inicial do chat
- System prompt com contexto real: nome, serviços, profissionais, faturamento do mês
- Modelo: claude-haiku-4-5-20251001 (rápido e barato)
- Créditos: US$5 na conta Anthropic (pré-pago, ~1.500 conversas)
- Variável: ANTHROPIC_API_KEY no .env.local

**Plano PRIME (futuro):** página completa /dashboard/livia com histórico persistido

---

## 8. PRÓXIMAS ETAPAS — ROADMAP

### 🔜 AMANHÃ — DIA 11

**A) Agenda mensal estilo Google Calendar:**

- Grid de semanas com todos os dias do mês
- Navegação por mês (anterior/próximo)
- Clique no dia abre agendamentos daquele dia
- Design dark, cores LIVO, mantém visão por barbeiro
- Substituir agenda-board.tsx atual

**B) Dark/Light mode completo:**

- Refatorar todas as cores hardcoded (style={{ backgroundColor: "#050505" }} etc) para CSS variables
- Tema claro funcional em todas as páginas do dashboard
- Toggle já existe — falta as páginas responderem

### DEPOIS:

- LIVO PRIME: pagamento online, assinatura de cliente, página completa da Lívia
- WhatsApp automático (Z-API ou Evolution API) — confirmação de agendamento

---

## 9. PENDÊNCIAS & CUIDADOS

- **@@map():** obrigatório nas tabelas, nunca nos campos individuais.
- **WaitlistLead:** NUNCA deletar — 14 leads reais do workshop TX.
- **endTime em Appointment:** DateTime? — sempre checar nulidade.
- **clientPhone em Appointment:** nullable — sempre tratar como string | null.
- **auth.ts:** importar sempre como `import { auth } from "@/auth"`
- **priceInCents:** sempre em centavos. Dividir por 100 ao exibir.
- **$transaction:** SEMPRE padrão async. NUNCA array de promises.
- **RESEND_FROM:** sempre noreply@livobarber.com.br.
- **Next.js 16 — params:** sempre `const { param } = await params`.
- **Turbopack — JSX `<a>`:** href e target na mesma linha.
- **PowerShell:** Select-String. Caminhos com [colchetes] usar caminho absoluto.
- **Plano START:** mantido no enum, não vendido. Script update-plan.ts migra para pro.
- **migration_lock.toml:** não editar manualmente.
- **Nunca rodar `prisma migrate dev` sem antes rodar `prisma migrate diff`.**
- **layout.tsx dashboard é "use client"** — não fazer queries ao banco nele.
- **useToast():** apenas em Client Components. Lança erro fora do ToastProvider.
- **loading.tsx:** mesmo nível da page.tsx para Suspense automático.
- **ANTHROPIC_API_KEY:** chave no .env.local. Nunca commitar o valor.
- **Lívia usa claude-haiku-4-5-20251001** — rápido e barato. Não trocar para opus sem avaliar custo.
- **Tema claro:** parcialmente implementado via data-theme. Páginas com style={} inline ainda não respondem — refatoração completa no DIA 11.

---

## 10. MARCA & IDENTIDADE VISUAL

- **Logo:** LIVOTX — "LI" branco, "VO" vermelho #C8102E, "TX" dourado #C8A24C.
- **Ícone:** L quadrado com fundo vermelho #C8102E.
- **Lívia:** assistente IA, foto em public/livia.png, bubble no canto inferior direito.
- **Cores:**
  - Vermelho: #C8102E (ação) e #E0263D (hover)
  - Dourado: #C8A24C (premium)
  - Fundo: #0B0B0D (geral), #17171C (card), #1F1F27 (card elevado)
  - Borda: #2A2A33
  - Texto: #FFFFFF (principal), #9A9AA6 (secundário), #6E6E78 (terciário)
  - Status: verde #3FB950, amarelo #D4A72C, cinza #5E5E68, vermelho #C8102E
- **Visual:** dark theme predominante. Light theme em desenvolvimento.
- **Referências:** Cash Barber (maturidade), Stripe/Linear/Notion (beleza)
- **NÃO pode parecer:** projeto iniciante, template Bootstrap, dashboard genérico.

---

## 11. DECISÕES ARQUITETURAIS

- **Auth:** JWT, roles não no token, 1 query por request.
- **Membership:** Usuário → Membership → Barbearia.
- **Convites:** token UUID, 7 dias.
- **Mapa:** OpenStreetMap embed, sem API key.
- **Slug:** gerado no onboarding, não editável.
- **@@map():** tabelas snake_case, campos camelCase.
- **Estoque:** saldo + extrato.
- **Comanda:** independente de agendamento. Snapshot de preço. Baixa no fechamento.
- **Comissões:** percentuais em Membership. Calculados no fechamento. Histórico imutável.
- **Relatórios/Marketing:** queries de leitura pura. Sem cache. Sem migração.
- **Gráficos:** SVG puro + CSS. Zero dependências externas.
- **$transaction:** sempre padrão async.
- **Server Actions:** não retornam objeto quando fazem redirect(). try/catch no componente.
- **Toast:** sistema próprio. ToastProvider no layout raiz.
- **Skeletons:** loading.tsx por rota.
- **Active state:** usePathname() no layout "use client".
- **Mobile menu:** estado local no layout. Fecha no Escape e ao trocar de rota.
- **Lívia PRO:** bubble flutuante. Contexto real da barbearia no system prompt. Modelo Haiku.
- **Lívia PRIME:** página completa com histórico persistido (futuro).
- **Logo:** SVG com tspan — letras coladas sem espaço, cores independentes por segmento.

---

## 12. CHANGELOG

### 31/05/2026

Membership, Invitation, WaitlistLead, RBAC, página VIP.

### 01/06/2026

14 leads workshop TX, sistema de convites completo, onboarding enriquecido.

### 02/06/2026 — DIAS 3 a 9

CRM, agenda colunar, produtos, comandas, comissões, relatórios, marketing.
Build: 27 páginas, zero erros TypeScript.

### 03/06/2026 — DIA 10 + AJUSTES

Zero migração. Zero dependências novas.
Skeletons, toasts, active state, mobile menu, dark/light toggle (parcial).
Logo SVG (LIVOTX com tspan), ícone L, favicon.
Badge de plano dinâmico (start/pro/prime com cores).
Saudação com nome da barbearia.
Menu: "Início" + ícone Home.
Lívia: bubble chat IA no dashboard PRO.
API Anthropic: claude-haiku-4-5-20251001, US$5 de crédito.
Build: 27+ páginas, zero erros TypeScript.

### 03/06/2026 — DIA 11

**A) Agenda mensal:**

- src/components/monthly-calendar.tsx — grid mensal com navegação por mês, dots de status, botão "Hoje"
- src/components/day-panel.tsx — painel lateral com agendamentos do dia, total, status
- agenda/page.tsx — query corrigida: campo `date` (não startTime), filtro por `professionalId` direto

**B) Dark/Light mode completo:**

- globals.css — bloco :root com todas as CSS variables + override [data-theme="light"]
- layout.tsx (dashboard) — sidebar, header mobile, nav links → variáveis CSS
- dashboard/page.tsx — KPIs, agenda do dia, analytics → variáveis CSS
- clients-client.tsx — refatorado + useState tipagem corrigida
- comandas-client.tsx — refatorado + useState tipagem corrigida
- settings/page.tsx + basic-info-form + business-hours-form + services-manager → variáveis CSS
- produtos/produtos-client.tsx → variáveis CSS
- comissoes/comissoes-client.tsx → variáveis CSS
- relatorios/relatorios-client.tsx — gráfico SVG usa var() nativo
- marketing/marketing-client.tsx → variáveis CSS
- comandas/[id]/comanda-pdv.tsx → variáveis CSS
- comandas/nova/nova-comanda-form.tsx → variáveis CSS
- ui/skeleton, toast, badge, empty-state → variáveis CSS
- Build: zero erros TypeScript, 27+ páginas

**Pendências identificadas pelos usuários reais (DIA 12):**

- Badge START → forçar PRO para barbearias ativas
- Comissões: owner sem membership de barbeiro → tratar erro com mensagem amigável
- Agendamentos não aparecem na agenda → investigar timezone/query
- CRM: cadastro manual de clientes
- Logo SVG: versão para tema claro (LI em preto)
- Agenda: visualização por semana e por dia além do mês (estilo Google Calendar)

### 03/06/2026 — DIA 12

**Badge de plano:**

- PLAN_LABELS: start → "PRO" (nunca exibir START na UI)
- PLAN_COLORS: start herda cores do PRO (vermelho)
- Fallback planColor: PLAN_COLORS.pro

**CRM — Cadastro manual de clientes:**

- createClient action em clients/actions.ts
- Modal completo: nome, telefone, email, CPF, nascimento, origem, notas
- Validação de duplicata por telefone
- Botão "＋ Novo cliente" no header da página
- Link "cadastre o primeiro cliente" no estado vazio

**Agenda — Bug de timezone corrigido:**

- Query usa Date.UTC() — independente do fuso do servidor
- Tipos Date|string em AppointmentForCalendar (startTime, endTime)
- toLocalDateKey aceita Date|string
- formatTime e formatDate aceitam Date|string

**Comissões — Erro amigável:**

- Owner filtrado de membershipsComProf (role !== MemberRole.owner)
- Caixa de erro vermelha com ⚠️ no modal em vez de texto simples

**Logo tema claro:**

- public/logo-livo-light.svg criado (LI em #0B0B0D)
- layout.tsx troca src dinamicamente por tema

**Agenda — Visões Mês/Semana/Dia:**

- src/components/weekly-calendar.tsx criado
- src/components/day-calendar.tsx criado (slots 30min, 07h–21h)
- monthly-calendar.tsx: toggle ViewToggle + imports + lógica de visão
- Navegação independente por semana e por dia

**Correções de produção (emergência):**

- layout.tsx dashboard: encoding corrompido (UTF-8) — arquivo reescrito
- settings/page.tsx: onMouseEnter/onMouseLeave removidos do Server Component
- CSS puro: .settings-acessos-link:hover em globals.css
- Banco Neon hibernado: acordado manualmente via console.neon.tech

**Build:** zero erros TypeScript, 30+ páginas funcionando

PENDÊNCIAS — atualizar:
markdown## 9. PENDÊNCIAS & CUIDADOS

- **@@map():** obrigatório nas tabelas, nunca nos campos individuais.
- **WaitlistLead:** NUNCA deletar — 14 leads reais do workshop TX.
- **endTime em Appointment:** DateTime? — sempre checar nulidade.
- **clientPhone em Appointment:** nullable — sempre tratar como string | null.
- **auth.ts:** importar sempre como `import { auth } from "@/auth"`
- **priceInCents:** sempre em centavos. Dividir por 100 ao exibir.
- **$transaction:** SEMPRE padrão async. NUNCA array de promises.
- **RESEND_FROM:** sempre noreply@livobarber.com.br.
- **Next.js 16 — params:** sempre `const { param } = await params`.
- **Turbopack — JSX `<a>`:** href e target na mesma linha.
- **PowerShell:** Select-String. Caminhos com [colchetes] usar caminho absoluto.
- **Plano START:** mantido no enum, não vendido. Exibe "PRO" na UI.
- **migration_lock.toml:** não editar manualmente.
- **Nunca rodar `prisma migrate dev` sem antes rodar `prisma migrate diff`.**
- **layout.tsx dashboard é "use client"** — não fazer queries ao banco nele.
- **useToast():** apenas em Client Components.
- **loading.tsx:** mesmo nível da page.tsx para Suspense automático.
- **ANTHROPIC_API_KEY:** chave no .env.local. Nunca commitar o valor.
- **Lívia usa claude-haiku-4-5-20251001** — não trocar sem avaliar custo.
- **Tema claro:** implementado via data-theme. Logo troca dinamicamente.
- **Server Components:** NUNCA usar onMouseEnter/onMouseLeave inline — usar CSS puro ou mover para Client Component.
- **Encoding:** sempre salvar arquivos em UTF-8. Comentários com caracteres especiais (─, →, é) podem corromper em Windows.
- **Neon:** banco hiberna em inatividade. Acordar via console.neon.tech se necessário.
- **Date/string:** AppointmentForCalendar usa Date|string — Next.js serializa Date como string ao cruzar Server→Client.
- **Agenda query:** usar Date.UTC() para evitar problemas de timezone entre servidor e Brasília (UTC-3).
- **Comissões:** owner nunca aparece na lista de membershipsComProf.
- **createClient:** verifica duplicata por telefone antes de criar.

**Correções OAuth Google (madrugada):**

- auth.ts: fechamento `},` `});` estava comentado — build quebrava silenciosamente
- auth.ts: adicionado `checks: ["pkce", "state"]` no Google provider — resolve bug `unexpected "iss"` do Auth.js v5
- auth.ts: removido `events.createUser` do fluxo crítico — sendWelcomeEmail não bloqueia mais o login
- auth.ts: import `sendWelcomeEmail` removido temporariamente
- GOOGLE_CLIENT_SECRET: secret inválido na Vercel — gerado novo secret no Google Console e atualizado
- Google OAuth 100% funcional em produção no livobarber.com.br
- **auth.ts:** nunca comentar os fechamentos `},` `});` do NextAuth — quebra o build silenciosamente
- **Google OAuth:** usa `checks: ["pkce", "state"]` — não remover, resolve bug de iss mismatch do Auth.js v5
- **GOOGLE_CLIENT_SECRET:** se OAuth parar de funcionar, verificar se o secret foi invalidado no Google Console
- **sendWelcomeEmail:** removido do events.createUser — reimplementar via webhook ou job separado no futuro
