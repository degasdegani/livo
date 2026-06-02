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

**Atenção Next.js 16:**

- params em rotas dinâmicas é uma Promise — sempre usar `const { param } = await params` antes de acessar.
- Server Components não aceitam event handlers (onMouseEnter, onClick, etc) — usar classes Tailwind para hover ou criar Client Components.

**Atenção PowerShell Windows:**

- Caminhos com colchetes como `[slug]` travam o PowerShell mesmo com aspas simples.
- Usar o caminho absoluto: `Get-Content "C:\Projetos\livo\src\app\[slug]\page.tsx"`

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
│ ├── page.tsx ← Dashboard principal + card comissões barber
│ ├── actions.ts
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
│ │ ├── actions.ts ← getComandas, abrirComanda, fecharComanda, cancelarComanda, removeItem, addServicoItem, addProdutoItem, getComanda, getClientsForComanda, getComissoesData, type ResumoProf
│ │ ├── nova/
│ │ │ ├── page.tsx
│ │ │ └── nova-comanda-form.tsx
│ │ └── [id]/
│ │ ├── page.tsx
│ │ └── comanda-pdv.tsx
│ ├── comissoes/
│ │ ├── page.tsx
│ │ ├── comissoes-client.tsx
│ │ └── actions.ts ← re-export de getComissoesData
│ ├── relatorios/
│ ├── settings/
│ │ ├── page.tsx
│ │ ├── basic-info-form.tsx
│ │ ├── business-hours-form.tsx
│ │ ├── services-manager.tsx
│ │ └── acessos/
│ │ ├── page.tsx
│ │ ├── acessos-client.tsx
│ │ └── actions.ts ← inclui updateMembershipComissao
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

Todos os models usam @@map() para snake_case. Crítico — sem isso o Prisma dropa as tabelas.

### Mapeamentos obrigatórios:

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
- **Appointment**: id, date, endTime (DateTime? — nullable!), status, notes, clientName, clientPhone (nullable!), clientEmail, barbershopId, professionalId, serviceId, clientId (opcional), createdAt, updatedAt — relations: comanda (optional)
- **Client**: id, name, phone, email, notes, barbershopId, totalVisits, lastVisitAt, cpf, birthDate, street, neighborhood, cep, origem (ClientOrigem?), bloqueado (bool), createdAt, updatedAt — índice único: [phone, barbershopId]
- **BusinessHour**: id, dayOfWeek, openTime, closeTime, isOpen, barbershopId — índice único: [dayOfWeek, barbershopId]
- **Membership**: id, role, userId, barbershopId, professionalId (único, opcional), commissionOnServices (bool, default false), commissionOnProducts (bool, default false), commissionServicePct (Decimal? @db.Decimal(5,2)), commissionProductPct (Decimal? @db.Decimal(5,2)), isActive, createdAt, updatedAt — índice único: [userId, barbershopId]
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

**Migração aplicada:** `20260602200000_dia7_comissoes`
Tabelas Membership e Invitation renomeadas para snake_case com dados preservados.

**Campos adicionados no Membership:**

- commissionServicePct Decimal? @db.Decimal(5,2)
- commissionProductPct Decimal? @db.Decimal(5,2)

**Arquivos criados:**

- src/app/(dashboard)/dashboard/comissoes/page.tsx
- src/app/(dashboard)/dashboard/comissoes/comissoes-client.tsx
- src/app/(dashboard)/dashboard/comissoes/actions.ts

**Arquivos modificados:**

- comandas/actions.ts — fecharComanda calcula commissionPct/commissionValue na $transaction async. Exporta type ResumoProf. Nomes em português: abrirComanda, fecharComanda, cancelarComanda, removeItem, addServicoItem, addProdutoItem, getComandas, getComanda.
- comandas/comandas-client.tsx — filtros alinhados com actions (abertas/hoje/fechadas/todas). Tipo ComandaListItem definido localmente.
- comandas/nova/nova-comanda-form.tsx — usa abrirComanda (não openComanda). clientName nunca undefined. NEXT_REDIRECT tratado no catch.
- comandas/[id]/comanda-pdv.tsx — try/catch em todas as actions. removeItem com ordem correta (itemId, comandaId). Imports alinhados com nomes reais.
- settings/acessos/actions.ts — updateMembershipComissao adicionada
- dashboard/page.tsx — card de comissões para barber + import getCurrentMembership
- (dashboard)/layout.tsx — link Comissões com ícone DollarSign. roleAccess usando MemberRole enum.
- comandas/page.tsx — usa getComandas("abertas") em vez de listComandas("open")

**Build:** ✅ 23 páginas, zero erros TypeScript

**Lição crítica do Dia 7:**

- $transaction SEMPRE usar padrão async: `db.$transaction(async (tx) => {...})` — NUNCA array de promises
- Server Actions que fazem redirect() não retornam objeto — usar try/catch nos componentes, tratar NEXT_REDIRECT no catch
- Nomes de funções no actions.ts devem ser consistentes em TODO o projeto — um nome errado num import quebra o build

---

## 8. PRÓXIMAS ETAPAS — ROADMAP

### 🔜 DIA 8 — DASHBOARDS & RELATÓRIOS (PRÓXIMO CHAT)

- Dashboard do dono: faturamento por período, ticket médio, serviços mais vendidos, evolução mensal
- Dashboard do barbeiro: métricas próprias consolidadas
- Relatório mensal melhorado

### DIA 9 — PACOTES & MARKETING

- Pacotes/combos, ClientPackage
- Sumidos, aniversariantes, notificações manuais

### DIA 10 — ACABAMENTO VISUAL

- Dark/light mode, visual premium, microinterações

### DEPOIS:

- Assistente IA WhatsApp (Z-API ou Evolution API)
- LIVO PRIME: pagamento online, assinatura de cliente, IA preditiva, PWA

---

## 9. PENDÊNCIAS & CUIDADOS

- **@@map() é OBRIGATÓRIO** em todos os models — Membership e Invitation agora estão corretos.
- **WaitlistLead:** 14 registros reais do workshop TX. NUNCA deletar.
- **endTime em Appointment é DateTime?** — sempre checar nulidade.
- **clientPhone em Appointment é nullable** — sempre tratar como string | null.
- **auth.ts está em src/auth.ts** — importar sempre como `import { auth } from "@/auth"`
- **priceInCents:** sempre em centavos. Dividir por 100 ao exibir.
- **$transaction:** SEMPRE usar padrão async `db.$transaction(async (tx) => { ... })` — NUNCA array de promises.
- **Server Actions com redirect():** usar try/catch no componente. Tratar NEXT_REDIRECT no catch (ignorar).
- **Nomes das functions em actions.ts:** abrirComanda, fecharComanda, cancelarComanda, removeItem, addServicoItem, addProdutoItem, getComandas, getComanda, getClientsForComanda, getComissoesData.
- **getComissoesData:** definida em comandas/actions.ts, re-exportada em comissoes/actions.ts. Exporta também `type ResumoProf`.
- **commissionServicePct/commissionProductPct:** Decimal(5,2) nullable. Usar Number() para converter.
- **RESEND_FROM:** sempre noreply@livobarber.com.br.
- **Next.js 16 — params:** sempre `const { param } = await params`.
- **PowerShell:** Select-String no lugar de grep. Caminhos com [colchetes] usar caminho absoluto.
- **Plano START:** mantido no enum, não é mais vendido.
- **migration_lock.toml:** não editar manualmente.
- **Nunca rodar `prisma migrate dev` sem antes rodar `prisma migrate diff`** para ver o que vai ser alterado.

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
- **@@map():** todos os models mapeados para snake_case
- **Estoque:** saldo + extrato (stockQuantity + StockMovement)
- **Comanda:** independente de agendamento. Snapshot de preço. Baixa só no fechamento.
- **Comissões:** percentuais em Membership. Calculados no fechamento via $transaction async. Histórico imutável em ComandaItem.
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

Migração dia7_comissoes. Tabelas renomeadas para snake_case (dados preservados).
commissionServicePct e commissionProductPct no Membership.
fecharComanda calcula e grava comissões na transaction async.
Página /comissoes com relatório, KPIs e configuração de percentuais.
Dashboard do barbeiro com card de comissões do mês.
Correção geral: imports alinhados, try/catch nas actions, NEXT_REDIRECT tratado.
Build limpo: 23 páginas, zero erros TypeScript.
