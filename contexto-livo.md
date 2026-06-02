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
├── auth.ts ← NÃO EXISTE NA RAIZ — está em src/auth.ts
├── middleware.ts ← Protege /dashboard e /onboarding
│ /convite, /vip e /[slug] são públicos
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
│ └── barbershop-map.tsx ← Mapa OpenStreetMap embed reutilizável
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
│ ├── layout.tsx ← PROTEGIDO: chama requireMembership()
│ └── dashboard/
│ ├── page.tsx ← Dashboard principal (KPIs + agenda do dia)
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
│ │ ├── page.tsx ← Server Component
│ │ ├── produtos-client.tsx ← Client Component: UI completa
│ │ └── actions.ts ← Server Actions: CRUD + estoque
│ ├── relatorios/
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
- WaitlistLead → @@map("waitlist_leads") ← CRÍTICO — 14 leads reais do workshop TX
- ProductCategory → @@map("product_categories")
- Product → @@map("products")
- StockMovement → @@map("stock_movements")

### Models:

- **User**: id, name, email (único), emailVerified, image, password, cpf (único, opcional), birthDate (opcional), createdAt, updatedAt
- **Account**, **Session**, **VerificationToken**: Auth.js padrão
- **Barbershop**: id, name, slug (único), phone, city, state, street, neighborhood, cep (todos opcionais), plan, planStatus, trialEndsAt, asaasCustomerId, asaasSubscriptionId, isActive, ownerId (único), createdAt, updatedAt — relations: productCategories, products, stockMovements
- **Professional**: id, name, bio, avatarUrl, isActive, barbershopId, createdAt, updatedAt
- **Service**: id, name, description, durationMin, priceInCents (centavos!), isActive, barbershopId
- **Appointment**: id, date, endTime (DateTime? — nullable!), status, notes, clientName, clientPhone (nullable!), clientEmail, barbershopId, professionalId, serviceId, clientId (opcional), createdAt, updatedAt
- **Client**: id, name, phone, email, notes, barbershopId, totalVisits, lastVisitAt, cpf (opcional), birthDate (opcional), street, neighborhood, cep, origem (ClientOrigem?), bloqueado (bool, default false), createdAt, updatedAt — índice único: [phone, barbershopId]
- **BusinessHour**: id, dayOfWeek, openTime, closeTime, isOpen, barbershopId — índice único: [dayOfWeek, barbershopId]
- **Membership**: id, role, userId, barbershopId, professionalId (único, opcional), commissionOnServices, commissionOnProducts, isActive, createdAt, updatedAt — índice único: [userId, barbershopId]
- **Invitation**: id, email, role, token (único), status, expiresAt, professionalId (opcional), commissionOnServices, commissionOnProducts, barbershopId, invitedById, createdAt, acceptedAt
- **WaitlistLead**: id, name, whatsapp, email, barbershopName, source, createdAt ⚠️ NUNCA DELETAR
- **ProductCategory**: id, name, barbershopId — índice único: [name, barbershopId]
- **Product**: id, name, description, costInCents, priceInCents, stockQuantity, minStockAlert, isActive, barbershopId, categoryId (opcional)
- **StockMovement**: id, quantity (Int, pode ser negativo), reason (StockMovementReason), notes, productId, barbershopId, createdAt

### Enums:

```prisma
enum Plan { start, pro, prime }
enum AppointmentStatus { pending, confirmed, completed, cancelled, no_show }
enum MemberRole { owner, reception, barber }
enum InvitationStatus { pending, accepted, revoked, expired }
enum ClientOrigem { Indicacao, Google, Instagram, Fachada, Outro }
enum StockMovementReason { purchase, comanda_use, manual_adjustment, loss, return }
```

---

## 5. RBAC E PERMISSÕES

### Arquivo: src/lib/permissions.ts

```typescript
type MembershipContext = {
  membershipId: string;
  userId: string;
  role: MemberRole;
  barbershopId: string;
  professionalId: string | null;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
};
```

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
const clients = await db.client.findMany({ where: clientScope(membership) });
```

---

## 6. REGRAS DE NEGÓCIO DOS ACESSOS

### Os 3 papéis do PRO:

**OWNER:** acesso total. Convida/revoga membros. Liga/desliga comissionamento.
**RECEPTION:** vê todos os clientes e agendamentos. NÃO acessa financeiro geral.
**BARBER:** escopo restrito ao próprio. Só seus clientes, agendamentos, comissões.

### RBAC em Produtos:

- **owner**: CRUD completo de produtos, categorias e movimentações
- **reception**: pode ver e registrar movimentações; pode criar/editar produtos
- **barber**: somente leitura

### Fluxo de convite: email → Invitation (token 7 dias) → /convite/[token] → Membership

---

## 7. O QUE JÁ ESTÁ CONSTRUÍDO

### ✅ SISTEMA BASE

- Onboarding, trial 30 dias, página pública /[slug], dashboard KPIs, agenda, CRM automático, configurações, relatórios mensais, e-mail Resend, assinatura Asaas.

### ✅ DIA 1 — FUNDAÇÃO DE ACESSOS

- Schema Membership + Invitation + WaitlistLead, RBAC completo, página VIP.

### ✅ DIA 2 — SISTEMA DE CONVITES

- Tela /acessos, e-mail convite, página /convite/[token], revogar/reenviar convites.

### ✅ DIA 3 — CLIENTES COMPLETOS + ENDEREÇO + MAPA

**Migração aplicada:** `20260602124008_dia3_endereco_clientes`

- User: cpf (@unique), birthDate
- Barbershop: street, neighborhood, cep
- Client: cpf, birthDate, street, neighborhood, cep, origem (ClientOrigem?), bloqueado
- Enum novo: ClientOrigem

**Onboarding atualizado:**

- Endereço obrigatório (street, neighborhood, cep, city, state)
- Slug gerado automaticamente a partir do nome — somente leitura
- Data nascimento: máscara DD/MM/AAAA (sem input type=date)
- CEP auto-preenche via ViaCEP (onBlur)
- CPF e birthDate salvos no banco
- Import auth corrigido para "@/auth"

**CRM de clientes:**

- Busca por nome, telefone, e-mail, CPF
- Filtros: origem, sumidos (30/60/90/120 dias), aniversariantes do mês, bloqueados
- KPIs: total, aniversariantes deste mês, bloqueados
- Painel lateral: detalhe completo + WhatsApp direto + bloquear/desbloquear
- Escopo por papel (clientScope do RBAC)

**Mapa:**

- Componente src/components/barbershop-map.tsx
- Usa OpenStreetMap embed (gratuito, sem API key, sem restrições)
- Integrado em /[slug] — aparece quando barbershop.street && barbershop.city existem
- Link "Ver no Google Maps" abaixo do mapa

### ✅ DIA 4 — AGENDA POR BARBEIRO

**Arquivos criados/modificados:**

- `src/app/(dashboard)/dashboard/agenda/agenda-actions.ts`
- `src/app/(dashboard)/dashboard/agenda/agenda-board.tsx`
- `src/app/(dashboard)/dashboard/agenda/page.tsx`

**Funcionalidades:**

- Visão colunar: uma coluna por profissional ativo
- Grade 08:00–20:00, slots de 30min, altura 56px por slot (SLOT_HEIGHT = 56)
- Cartões coloridos por status
- Navegação de data com setas + botão "Hoje"
- Click em cartão → modal com detalhes + ações de status
- Mover entre barbeiros (só owner e reception)
- Click em slot vazio → modal de novo agendamento rápido
- RBAC: barber só vê sua coluna

### ✅ DIA 5 — PRODUTOS & ESTOQUE

**Migração aplicada:** `dia5_produtos_estoque`

**Models novos:**

- ProductCategory → @@map("product_categories")
- Product → @@map("products")
- StockMovement → @@map("stock_movements")
- Enum: StockMovementReason { purchase, comanda_use, manual_adjustment, loss, return }

**Relações adicionadas em Barbershop:** productCategories, products, stockMovements

**Arquivos criados:**

- `src/app/(dashboard)/dashboard/produtos/page.tsx`
- `src/app/(dashboard)/dashboard/produtos/produtos-client.tsx`
- `src/app/(dashboard)/dashboard/produtos/actions.ts`

**Funcionalidades:**

- CRUD de categorias com confirmação de exclusão
- CRUD de produtos com preço de custo, venda, estoque inicial e alerta mínimo
- Máscara monetária no input (ex: digita 1990 → mostra 19,90)
- Filtros: busca por nome, por categoria, por status de estoque (todos / baixo / zerado)
- KPIs: produtos ativos, em alerta, sem estoque
- Cartões com visual de alerta (amarelo = baixo, vermelho = zerado)
- Modal de movimentação de estoque: entrada/saída, motivo, observação
- Histórico de movimentações carregado sob demanda (last 50)
- RBAC: barber = somente leitura; owner/reception = CRUD

**Integração futura (Dia 6):**

- Comandas vão decrementar stockQuantity e criar StockMovement com reason: "comanda_use"

---

## 8. PRÓXIMAS ETAPAS — ROADMAP

### 🔜 DIA 6 — COMANDAS (PDV) (PRÓXIMO CHAT)

- Models: Comanda, ComandaItem
- Fluxo: abrir → itens (serviços + produtos) → fechar com forma de pagamento
- Baixa automática de estoque no fechamento
- Snapshot de comissão no fechamento

### DIA 7 — COMISSÕES

- Regras por Membership (% ou valor fixo)
- Cálculo no fechamento da comanda
- Relatório por profissional

### DIA 8 — DASHBOARDS & RELATÓRIOS

- Dashboard do dono: operacional + estratégico
- Dashboard do barbeiro: métricas próprias

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

- **@@map() é OBRIGATÓRIO** em todos os models — sem ele o Prisma dropa tabelas ao migrar.
- **WaitlistLead:** 14 registros reais do workshop TX. NUNCA deletar. NUNCA incluir em limpezas.
- **endTime em Appointment é DateTime?** — sempre checar nulidade antes de chamar .getHours()
- **clientPhone em Appointment é nullable** — sempre tratar como string | null
- **auth.ts está em src/auth.ts** — importar sempre como `import { auth } from "@/auth"`
- **CPF no User:** @unique global. CPF no Client: sem @unique (pode repetir entre barbearias).
- **Endereço obrigatório no onboarding** desde Dia 3. Barbearias antigas têm campos null.
- **Mapa:** usa OpenStreetMap. Aparece só se barbershop.street && barbershop.city existirem.
- **Slug:** gerado automaticamente no onboarding, somente leitura. Não deixar o barbeiro editar.
- **priceInCents:** preços no banco em centavos. Sempre dividir por 100 ao exibir. Válido para produtos também (costInCents e priceInCents).
- **stockQuantity em Product:** Int (unidades inteiras). StockMovement.quantity pode ser negativo (saída).
- **RESEND_FROM:** sempre noreply@livobarber.com.br. Nunca livo.com.br.
- **Next.js 16 — params:** sempre `const { param } = await params` em rotas dinâmicas.
- **Next.js 16 — Server Components:** não usar event handlers inline.
- **PowerShell:** usar Select-String no lugar de grep. Caminhos com [colchetes] usar caminho absoluto.
- **Plano START:** mantido no enum, não é mais vendido.
- **QR Code VIP:** aponta para https://livobarber.com.br/vip.

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
- **Membership:** Usuário → Membership → Barbearia (suporta múltiplas barbearias no futuro)
- **Convites:** token UUID, 7 dias, reenvio gera novo token
- **Endereço:** campos separados desde Dia 3 (street, neighborhood, cep, city, state)
- **Mapa:** OpenStreetMap embed, sem API key, gratuito
- **Slug:** gerado automaticamente no onboarding, não editável pelo usuário
- **CPF dono:** salvo em User (único global). CPF cliente: salvo em Client (não único).
- **@@map():** todos os models mapeados para snake_case — crítico para não dropar tabelas
- **Agenda colunar:** Client Component com refreshData() sem reload.
- **Estoque:** padrão "saldo + extrato" — stockQuantity no Product (consulta rápida) + StockMovement (auditoria completa). No Dia 6, fechamento de comanda cria StockMovement e decrementa stockQuantity em transação atômica ($transaction).

---

## 12. CHANGELOG

### 31/05/2026

- Membership, Invitation, WaitlistLead, RBAC, página VIP

### 01/06/2026

- 14 leads workshop TX, sistema de convites completo, onboarding enriquecido

### 02/06/2026 — DIA 3

- Migração dia3_endereco_clientes
- @@map() adicionado em todos os models (correção crítica)
- Onboarding: endereço obrigatório, slug somente leitura, data com máscara, CEP via ViaCEP
- CRM clientes: busca, filtros, KPIs, painel lateral, bloquear/desbloquear
- Mapa OpenStreetMap na página pública /[slug]
- Fix: endTime nullable em agenda/new/actions.ts e [slug]/book/actions.ts
- Fix: import auth corrigido para "@/auth"

### 02/06/2026 — DIA 4

- Agenda colunar por barbeiro: grade 08:00–20:00, slots 30min
- Cartões coloridos por status (pending/confirmed/completed/cancelled/no_show)
- Modal de detalhes do agendamento com ações de status
- Modal de remanejamento entre barbeiros (owner e reception)
- Modal de novo agendamento rápido ao clicar em slot vazio
- RBAC: barber vê apenas sua coluna
- Fix: clientPhone tratado como nullable no tipo AgendaAppointment

### 02/06/2026 — DIA 5

- Migração dia5_produtos_estoque
- Models: ProductCategory, Product, StockMovement + enum StockMovementReason
- CRUD de categorias: criar, editar, excluir com confirmação (desvincula produtos antes)
- CRUD de produtos: nome, descrição, categoria, custo, venda, estoque, alerta mínimo, ativo/inativo
- Estoque inicial registrado como StockMovement (reason: purchase) no cadastro
- Modal de movimentação: entrada/saída, motivo filtrado por tipo, observação
- Transação atômica ($transaction) ao movimentar estoque
- Histórico de movimentações sob demanda (last 50)
- KPIs: ativos, estoque baixo, sem estoque
- Filtros: busca, categoria, status de estoque
- RBAC: barber = read-only; owner/reception = CRUD
- Link "Produtos" adicionado no menu lateral do dashboard
