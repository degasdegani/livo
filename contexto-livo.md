0. MODO DE OPERAÇÃO — Leia antes de qualquer coisa
   Você é meu CTO virtual, arquiteto sênior e mentor técnico no projeto LIVO.

**Como entregar:**

- Português claro com analogias quando ajudar.
- Entregar TODO o conteúdo da etapa DE UMA VEZ, passo a passo, minuciosamente detalhado, ponto por ponto. Se eu tiver dúvidas, vou perguntando.
- Arquivos SEMPRE completos (nunca trechos). Com o caminho exato de onde criar/editar.
- Links diretos para qualquer ferramenta ou servienta externa. Nunca dizer "procure no menu".
- Nunca quebrar o que já funciona. Mudanças aditivas. Avisar riscos antes de executar.
- Ao FIM de cada etapa, entregar este .md ATUALIZADO para eu colar no próximo chat.
- Quando precisar explicar ações no terminal ou no sistema, ser MINUCIOSAMENTE detalhado passo a passo — explicar cada comando, cada clique, cada detalhe como se fosse a primeira vez.
- No Windows, usar Select-String no lugar de grep no PowerShell.

**Como pensar:**

- Arquiteto sênior: pensar em escalabilidade, manutenção e longo prazo.
- Questionar decisões ruins e sugerir melhores.
- Priorizar simplicidade. Evitar overengineering.
- Explicar riscos, vantagens e desvantagens quando relevante.

---

## 1. O PRODUTO

**Nome:** LIVO
**O que é:** SaaS de gestão para barbearias brasileiras.
**Posicionamento:** "O sistema operacional da barbearia moderna." — não é "só uma agenda".
**Diferencial real:** o núcleo operacional completo (agenda por barbeiro + comanda/PDV + produtos + comissões). A IA é marketing, entra depois.

**Planos:**

- **LIVO PRO — R$197/mês** (ou R$1.997/ano) — plano de entrada atual. 30 dias grátis. 3 acessos: 1 Dono + 1 Recepção + 1 Barbeiro colaborador.
- **LIVO PRIME — R$397/mês** (ou R$4.097/ano) — próxima fase. Tudo do PRO + pagamento online, assinatura de cliente, IA avançada, campanhas automáticas, exportação PDF/Excel, PWA, onboarding presencial.
- **Plano START foi descontinuado** como entrada. Ainda existe no código (enum), mas não é mais vendido.

**Situação comercial:**

- Sócios reais: **Barbearia TX** (parceria confirmada, sociedade a partir de 31/05/2026).
- ~10 vendas do PRO já feitas em pré-venda.
- 14 leads capturados no workshop (arquivo Word/PDF salvo localmente). Dados em WaitlistLead no banco — NUNCA deletar.
- Público-alvo imediato: donos de barbearia, Ribeirão Preto/Batatais e região.

---

## 2. STACK TÉCNICA COMPLETA

Frontend/Backend: Next.js 16 (App Router, pasta src/app) + React + TypeScript
Banco de dados: PostgreSQL hospedado no Neon (serverless, backups automáticos)
ORM: Prisma 5 — client em src/lib/db.ts (export: db)
Autenticação: Auth.js v5 (NextAuth) — arquivo: src/auth.ts (dentro de src/, não na raiz)
Sessão por JWT (não sessão no banco, apesar de ter tabela Session)
Providers: Google OAuth + Credentials (bcryptjs para senhas)
Sessão expõe: session.user.id
Exports: { handlers, auth, signIn, signOut }
Import correto: import { auth } from "@/auth"
E-mail: Resend — src/lib/email.ts
Pagamento: Asaas (PIX + cartão) — src/lib/asaas.ts
Hosting: Vercel (deploy automático a cada push no GitHub)
Domínio: livobarber.com.br (ativo no Registro.br)
Vercel preview: livo-lime.vercel.app
CI/CD: GitHub → Vercel (automático)
Scripts avulsos: npx tsx scripts/X.ts
(tsx e dotenv já instalados — todo script começa com import "dotenv/config")

**Variáveis de ambiente:**

- .env.local — contém TODOS os segredos reais (nunca vai pro GitHub, está no .gitignore)
- .env — contém apenas a estrutura/nomes das variáveis (vai pro GitHub como modelo)
- Variáveis que existem no .env.local: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, RESEND_API_KEY, RESEND_FROM, ASAAS_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_KEY (opcional, vazio por enquanto)
- RESEND_FROM deve ser "noreply@livobarber.com.br" — domínio livobarber.com.br está verificado no Resend. O domínio livo.com.br NÃO está verificado — nunca usar como remetente.

**Atenção Next.js 16 + Turbopack:**

- params em rotas dinâmicas é uma Promise — sempre usar `const { param } = await params` antes de acessar.
- Server Components não aceitam event handlers (onMouseEnter, onClick, etc) — usar classes Tailwind para hover ou criar Client Components.
- **JSX com múltiplos atributos em tags `<a>`:** Turbopack é estrito no parsing — sempre colocar `href` e `target` na mesma linha de abertura da tag. Quebra de linha entre atributos causa erro `Expected '</', got 'target'`.

**Atenção PowerShell Windows:**

- Caminhos com colchetes como `[slug]` travam o PowerShell mesmo com aspas simples.
- Usar o caminho absoluto: `Get-Content "C:\Projetos\livo\src\app\[slug]\page.tsx"`

**Atenção $queryRaw — nomes de colunas:**

- O Prisma só converte para snake_case colunas que têm `@map()` explícito no campo.
- Campos sem `@map()` ficam com o nome camelCase no banco (ex: `birthDate`, `barbershopId`).
- No `$queryRaw`, usar sempre o nome real da coluna com aspas duplas: `"birthDate"`, `"barbershopId"`.
- IDs gerados por cuid() são `::text[]`, não `::uuid[]`.

---

## 3. ESTRUTURA DE PASTAS COMPLETA

raiz/
├── middleware.ts ← Protege /dashboard e /onboarding
├── .env ← Estrutura pública (vai pro GitHub)
├── .env.local ← Segredos reais (NÃO vai pro GitHub)
├── contexto-livo.md ← Este arquivo
├── prisma/
│ └── schema.prisma ← Todos os modelos do banco
├── scripts/
│ ├── backfill-owner-memberships.ts
│ └── export-leads.ts
├── public/
│ └── logo.png
└── src/
├── auth.ts ← Config Auth.js v5 (importar como @/auth)
├── components/
│ └── barbershop-map.tsx
└── app/
├── layout.tsx
├── page.tsx ← Landing page pública
├── globals.css
├── (auth)/
│ ├── login/page.tsx
│ └── register/
│ ├── page.tsx
│ └── actions.ts
├── (dashboard)/
│ ├── layout.tsx ← PROTEGIDO: chama getCurrentMembership()
│ └── dashboard/
│ ├── page.tsx ← Dashboard principal + analytics owner (Dia 8) + card comissões barber
│ ├── actions.ts ← inclui getDashboardAnalytics() (Dia 8)
│ ├── appointment-actions.tsx
│ ├── agenda/
│ │ ├── page.tsx
│ │ ├── agenda-actions.ts
│ │ ├── agenda-board.tsx
│ │ ├── date-navigator.tsx
│ │ └── new/
│ │ ├── page.tsx
│ │ └── actions.ts
│ ├── clients/
│ │ ├── page.tsx
│ │ ├── clients-client.tsx
│ │ └── actions.ts
│ ├── produtos/
│ │ ├── page.tsx
│ │ ├── produtos-client.tsx
│ │ └── actions.ts
│ ├── comandas/
│ │ ├── page.tsx
│ │ ├── comandas-client.tsx
│ │ ├── actions.ts
│ │ ├── nova/
│ │ │ ├── page.tsx
│ │ │ └── nova-comanda-form.tsx
│ │ └── [id]/
│ │ ├── page.tsx
│ │ └── comanda-pdv.tsx
│ ├── comissoes/
│ │ ├── page.tsx
│ │ ├── comissoes-client.tsx
│ │ └── actions.ts
│ ├── relatorios/
│ │ ├── page.tsx
│ │ ├── actions.ts
│ │ └── relatorios-client.tsx
│ ├── marketing/
│ │ ├── page.tsx ← SSR + dados iniciais em paralelo (Dia 9)
│ │ ├── actions.ts ← getClientesSumidos(dias) + getAniversariantes() (Dia 9)
│ │ └── marketing-client.tsx ← abas, filtros, links WhatsApp (Dia 9)
│ ├── settings/
│ │ ├── page.tsx
│ │ ├── basic-info-form.tsx
│ │ ├── business-hours-form.tsx
│ │ ├── services-manager.tsx
│ │ └── acessos/
│ │ ├── page.tsx
│ │ ├── acessos-client.tsx
│ │ └── actions.ts
│ └── assinar/
├── (onboarding)/
│ └── onboarding/
│ ├── page.tsx
│ ├── actions.ts
│ └── data.ts
├── (legal)/
├── [slug]/
│ ├── page.tsx
│ └── book/
│ ├── page.tsx
│ └── actions.ts
├── api/
│ ├── auth/[...nextauth]/route.ts
│ └── webhooks/asaas/route.ts
├── convite/
│ └── [token]/
│ ├── page.tsx
│ ├── accept-form.tsx
│ └── actions.ts
└── vip/
├── page.tsx
├── vip-form.tsx
└── actions.ts
└── lib/
├── db.ts
├── email.ts
├── asaas.ts
├── permissions.ts
└── plans.ts

---

## 4. BANCO DE DADOS — SCHEMA COMPLETO

Todos os models usam @@map() para snake_case na tabela. Campos individuais NÃO têm @map() — ficam em camelCase no banco.

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
- WaitlistLead → @@map("waitlist_leads") ← CRÍTICO — 14 leads reais do workshop TX
- ProductCategory → @@map("product_categories")
- Product → @@map("products")
- StockMovement → @@map("stock_movements")
- Comanda → @@map("comandas")
- ComandaItem → @@map("comanda_items")

### Models:

- **User**: id, name, email (único), emailVerified, image, password, cpf (único, opcional), birthDate (opcional), createdAt, updatedAt
- **Account**, **Session**, **VerificationToken**: Auth.js padrão
- **Barbershop**: id, name, slug (único), phone, city, state, street, neighborhood, cep, plan, planStatus, trialEndsAt, asaasCustomerId, asaasSubscriptionId, isActive, ownerId (único), createdAt, updatedAt
- **Professional**: id, name, bio, avatarUrl, isActive, barbershopId, createdAt, updatedAt
- **Service**: id, name, description, durationMin, priceInCents, isActive, barbershopId
- **Appointment**: id, date, endTime (DateTime? — nullable!), status, notes, clientName, clientPhone (nullable!), clientEmail, barbershopId, professionalId, serviceId, clientId (opcional), createdAt, updatedAt
- **Client**: id, name, phone, email, notes, barbershopId, totalVisits, lastVisitAt, cpf, birthDate, street, neighborhood, cep, origem (ClientOrigem?), bloqueado (bool), createdAt, updatedAt — índice único: [phone, barbershopId]
- **BusinessHour**: id, dayOfWeek, openTime, closeTime, isOpen, barbershopId — índice único: [dayOfWeek, barbershopId]
- **Membership**: id, role, userId, barbershopId, professionalId (único, opcional), commissionOnServices (bool), commissionOnProducts (bool), commissionServicePct (Decimal?), commissionProductPct (Decimal?), isActive, createdAt, updatedAt — índice único: [userId, barbershopId]
- **Invitation**: id, email, role, token (único), status, expiresAt, professionalId (opcional), commissionOnServices, commissionOnProducts, barbershopId, invitedById, createdAt, acceptedAt
- **WaitlistLead**: id, name, whatsapp, email, barbershopName, source, createdAt ⚠️ NUNCA DELETAR
- **ProductCategory**: id, name, barbershopId — índice único: [name, barbershopId]
- **Product**: id, name, description, costInCents, priceInCents, stockQuantity, minStockAlert, isActive, barbershopId, categoryId (opcional)
- **StockMovement**: id, quantity (Int, pode ser negativo), reason (StockMovementReason), notes, productId, barbershopId, createdAt
- **Comanda**: id, status, paymentMethod?, clientId?, clientName, notes, totalInCents, openedAt, closedAt?, barbershopId, professionalId, appointmentId? (@unique)
- **ComandaItem**: id, type, serviceId?, serviceName, servicePrice, productId?, productName, productPrice, quantity, unitPriceInCents, totalInCents, commissionPct (Decimal?), commissionValue (Int?), comandaId

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

**Funções disponíveis:**

- getCurrentUser() — retorna usuário logado ou null
- getCurrentMembership() — busca crachá ativo no banco
- requireMembership() — exige crachá. Sem crachá → redirect("/login")
- requireRole(roles) — exige papel. Sem permissão → redirect("/dashboard")
- isOwner(m), canSeeAllClients(m), clientScope(m), appointmentScope(m)

**Padrão de uso:**

```typescript
const membership = await requireMembership();
const membership = await requireRole("owner");
const membership = await requireRole(["owner", "reception"]);
```

---

## 6. REGRAS DE NEGÓCIO DOS ACESSOS

**OWNER:** acesso total. Convida/revoga membros. Configura comissões.
**RECEPTION:** vê todos os clientes e agendamentos. NÃO acessa financeiro geral.
**BARBER:** escopo restrito ao próprio.

### RBAC em Comissões:

- **owner**: ver todas + configurar percentuais por barbeiro
- **reception**: ver relatório geral (sem configurar)
- **barber**: ver apenas as próprias comissões

### RBAC em Relatórios (Dia 8):

- **owner**: acesso completo — todos os KPIs + ranking de barbeiros + métodos de pagamento
- **reception**: acesso completo — todos os KPIs (sem ranking de barbeiros)
- **barber**: sem acesso a /relatorios — ver métricas próprias em /comissoes

### RBAC em Marketing (Dia 9):

- **owner**: acesso completo — todos os clientes sumidos + todos os aniversariantes
- **reception**: acesso completo — todos os clientes sumidos + todos os aniversariantes
- **barber**: sem acesso — item não aparece no menu

### Fluxo de convite: email → Invitation (token 7 dias) → /convite/[token] → Membership

---

## 7. O QUE JÁ ESTÁ CONSTRUÍDO

### ✅ SISTEMA BASE

Onboarding, trial 30 dias, página pública /[slug], dashboard KPIs, agenda, CRM, configurações, relatórios mensais, e-mail Resend, assinatura Asaas.

### ✅ DIA 1 — FUNDAÇÃO DE ACESSOS

Schema Membership + Invitation + WaitlistLead, RBAC completo, página VIP.

### ✅ DIA 2 — SISTEMA DE CONVITES

Tela /acessos, e-mail convite, página /convite/[token], revogar/reenviar convites.

### ✅ DIA 3 — CLIENTES COMPLETOS + ENDEREÇO + MAPA

Migração dia3_endereco_clientes. CRM completo, mapa OpenStreetMap, onboarding enriquecido.

### ✅ DIA 4 — AGENDA POR BARBEIRO

Agenda colunar, grade 08:00–20:00, slots 30min, RBAC por coluna.

### ✅ DIA 5 — PRODUTOS & ESTOQUE

Migração dia5_produtos_estoque. CRUD produtos/categorias, movimentações, KPIs.

### ✅ DIA 6 — COMANDAS (PDV)

Migração dia6_comandas. Fluxo abrir→itens→fechar, baixa de estoque, cancelamento com estorno.

### ✅ DIA 7 — COMISSÕES

Migração dia7_comissoes. commissionServicePct + commissionProductPct no Membership.
fecharComanda calcula e grava comissões na transaction async.
Página /comissoes com relatório, KPIs e configuração de percentuais.
Dashboard do barbeiro com card de comissões do mês.
Build limpo: 23 páginas, zero erros TypeScript.

### ✅ DIA 8 — DASHBOARDS & RELATÓRIOS

**Zero migração de banco.**
getDashboardAnalytics() em dashboard/actions.ts.
getRelatorioData(periodo) em relatorios/actions.ts.
RelatoriosClient — gráfico SVG, tabelas, ranking, métodos de pagamento.
Build: 25 páginas, zero erros TypeScript.

### ✅ DIA 9 — MARKETING & RETENÇÃO

**Zero migração de banco.**

**Arquivos criados:**

- src/app/(dashboard)/dashboard/marketing/actions.ts — getClientesSumidos(dias) + getAniversariantes()
- src/app/(dashboard)/dashboard/marketing/marketing-client.tsx — abas, filtros, links WhatsApp
- src/app/(dashboard)/dashboard/marketing/page.tsx — SSR + Promise.all

**Arquivos modificados:**

- src/app/(dashboard)/layout.tsx — Megaphone importado + item Marketing no NAV_ITEMS

**Funcionalidades:**

- Clientes Sumidos: filtro 30/60/90 dias, última visita, total de visitas, link WhatsApp direto
- Aniversariantes: mês atual via EXTRACT(MONTH), destaque dourado para aniversário de hoje
- Links wa.me: sanitização automática de telefone BR → 55XXXXXXXXXXX
- Mensagens pré-formatadas com nome do cliente e da barbearia
- RBAC: owner e reception com acesso completo; barber sem item no menu
- WhatsAppIcon extraído como componente SVG reutilizável
- Build: 27 páginas, zero erros TypeScript

**Lições do Dia 9:**

- $queryRaw precisa usar nomes reais das colunas — camelCase com aspas duplas quando não há @map() no campo
- cuid() é ::text[], não ::uuid[]
- Turbopack: tags `<a>` com href e target devem estar na mesma linha de abertura
- EXTRACT retorna Decimal no Prisma — sempre Number() para converter
- Dois providers OAuth (Google + Credentials) para o mesmo usuário criam dois User distintos no banco — o Membership fica vinculado a apenas um deles

---

## 8. PRÓXIMAS ETAPAS — ROADMAP

### 🔜 DIA 10 — ACABAMENTO VISUAL

- Polish geral da UI: consistência visual entre todas as páginas
- Active state no menu lateral (highlight da página atual)
- Loading states e skeletons
- Microinterações e transições
- Responsividade mobile básica

### DEPOIS:

- Assistente IA WhatsApp (Z-API ou Evolution API)
- LIVO PRIME: pagamento online, assinatura de cliente, IA preditiva, PWA

---

## 9. PENDÊNCIAS & CUIDADOS

- **@@map() é OBRIGATÓRIO** em todos os models — mas apenas nas tabelas, não nos campos.
- **Campos sem @map():** ficam em camelCase no banco. No $queryRaw usar aspas duplas: `"birthDate"`, `"barbershopId"`, `"lastVisitAt"`.
- **WaitlistLead:** 14 registros reais do workshop TX. NUNCA deletar.
- **endTime em Appointment é DateTime?** — sempre checar nulidade.
- **clientPhone em Appointment é nullable** — sempre tratar como string | null.
- **auth.ts está em src/auth.ts** — importar sempre como `import { auth } from "@/auth"`
- **priceInCents:** sempre em centavos. Dividir por 100 ao exibir.
- **$transaction:** SEMPRE usar padrão async `db.$transaction(async (tx) => { ... })` — NUNCA array de promises.
- **Server Actions com redirect():** usar try/catch no componente. Tratar NEXT_REDIRECT no catch (ignorar).
- **Nomes das functions em actions.ts:** abrirComanda, fecharComanda, cancelarComanda, removeItem, addServicoItem, addProdutoItem, getComandas, getComanda, getClientsForComanda, getComissoesData, getDashboardAnalytics, getRelatorioData, getClientesSumidos, getAniversariantes.
- **getComissoesData:** definida em comandas/actions.ts, re-exportada em comissoes/actions.ts. Exporta também `type ResumoProf`.
- **PeriodoFiltro:** tipo exportado em relatorios/actions.ts — "semana" | "mes" | "mes_anterior" | "ano".
- **DiasSumido:** tipo exportado em marketing/actions.ts — 30 | 60 | 90.
- **commissionServicePct/commissionProductPct:** Decimal(5,2) nullable. Usar Number() para converter.
- **commissionValue em ComandaItem:** Int (não Decimal).
- **EXTRACT no $queryRaw:** retorna Decimal — sempre Number() para converter.
- **RESEND_FROM:** sempre noreply@livobarber.com.br.
- **Next.js 16 — params:** sempre `const { param } = await params`.
- **Next.js 16 + Turbopack — JSX `<a>`:** href e target na mesma linha de abertura.
- **PowerShell:** Select-String no lugar de grep. Caminhos com [colchetes] usar caminho absoluto.
- **Plano START:** mantido no enum, não é mais vendido.
- **migration_lock.toml:** não editar manualmente.
- **Nunca rodar `prisma migrate dev` sem antes rodar `prisma migrate diff`.**
- **Dois providers para o mesmo email criam dois User distintos** — Membership fica vinculado a apenas um. Usar sempre o mesmo provider para login.

---

## 10. MARCA & IDENTIDADE VISUAL

- **Logo:** LIVOTX — "V" e "O" em vermelho #C8102E, "X" em dourado #C8A24C.
- **Cores:**
  - Vermelho: #C8102E (ação) e #E0263D (hover)
  - Dourado: #C8A24C (premium)
  - Fundo: #0B0B0D (geral), #17171C (card), #1F1F27 (card elevado)
  - Borda: #2A2A33
  - Texto: #FFFFFF (principal), #9A9AA6 (secundário), #6E6E78 (terciário)
  - Status: verde #3FB950, amarelo #D4A72C, cinza #5E5E68, vermelho #C8102E
- **Visual:** dark theme #050505
- **Referências:** Cash Barber (maturidade), Stripe/Linear/Notion (beleza)
- **NÃO pode parecer:** projeto iniciante, template Bootstrap, dashboard genérico.

---

## 11. DECISÕES ARQUITETURAIS

- **Auth:** JWT, roles não no token, 1 query por request via getCurrentMembership()
- **Membership:** Usuário → Membership → Barbearia
- **Convites:** token UUID, 7 dias, reenvio gera novo token
- **Mapa:** OpenStreetMap embed, sem API key, gratuito
- **Slug:** gerado automaticamente no onboarding, não editável
- **@@map():** tabelas em snake_case, campos em camelCase (sem @map individual)
- **Estoque:** saldo + extrato (stockQuantity + StockMovement)
- **Comanda:** independente de agendamento. Snapshot de preço. Baixa só no fechamento.
- **Comissões:** percentuais em Membership. Calculados no fechamento via $transaction async. Histórico imutável em ComandaItem.
- **Relatórios:** queries de leitura pura. Sem tabela de cache. Sem migração.
- **Marketing:** queries de leitura pura. $queryRaw para EXTRACT(MONTH). Links wa.me nativos.
- **Gráficos:** SVG puro + CSS. Zero dependências externas.
- **$transaction:** sempre padrão async — não usar array de promises.
- **Server Actions:** não retornam objeto quando fazem redirect(). Componentes usam try/catch.

---

## 12. CHANGELOG

### 31/05/2026

Membership, Invitation, WaitlistLead, RBAC, página VIP.

### 01/06/2026

14 leads workshop TX, sistema de convites completo, onboarding enriquecido.

### 02/06/2026 — DIA 3

Migração dia3_endereco_clientes. CRM clientes completo. Mapa OpenStreetMap.

### 02/06/2026 — DIA 4

Agenda colunar por barbeiro. RBAC por coluna.

### 02/06/2026 — DIA 5

Migração dia5_produtos_estoque. CRUD produtos/categorias/movimentações.

### 02/06/2026 — DIA 6

Migração dia6_comandas. PDV completo. Baixa de estoque. Cancelamento com estorno.

### 02/06/2026 — DIA 7

Migração dia7_comissoes. Comissões por barbeiro. Dashboard do barbeiro. Build: 23 páginas.

### 02/06/2026 — DIA 8

Zero migração. Analytics dashboard owner. Relatórios com filtros e gráfico SVG. Build: 25 páginas.

### 02/06/2026 — DIA 9

Zero migração.
getClientesSumidos(dias) e getAniversariantes() em marketing/actions.ts.
$queryRaw com colunas camelCase entre aspas duplas — lição crítica registrada.
MarketingClient — abas, filtros 30/60/90 dias, links WhatsApp nativos, WhatsAppIcon componente.
marketing/page.tsx — SSR com Promise.all.
layout.tsx — Megaphone + item Marketing no NAV_ITEMS (owner + reception).
Correção Turbopack: href e target na mesma linha em tags <a>.
Correção $queryRaw: birth_date → "birthDate", ::uuid[] → ::text[].
Build: 27 páginas, zero erros TypeScript.
