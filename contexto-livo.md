0. MODO DE OPERAÇÃO — Leia antes de qualquer coisa
   Você é meu CTO virtual, arquiteto sênior e mentor técnico no projeto LIVO.

**Como entregar:**

- Português claro com analogias quando ajudar.
- Entregar TODO o conteúdo da etapa DE UMA VEZ, passo a passo, minuciosamente detalhado, ponto por ponto. Se eu tiver dúvidas, vou perguntando.
- Arquivos SEMPRE completos (nunca trechos). Com o caminho exato de onde criar/editar.
- Links diretos para qualquer ferramenta ou serviço externo. Nunca dizer "procure no menu".
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
Autenticação: Auth.js v5 (NextAuth) — arquivo: auth.ts na RAIZ do projeto
Sessão por JWT (não sessão no banco, apesar de ter tabela Session)
Providers: Google OAuth + Credentials (bcryptjs para senhas)
Sessão expõe: session.user.id
Exports: { handlers, auth, signIn, signOut }
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
- Variáveis que existem no .env.local: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, RESEND_API_KEY, RESEND_FROM, ASAAS_API_KEY, e outras.
- RESEND_FROM deve ser "noreply@livobarber.com.br" — domínio livobarber.com.br está verificado no Resend. O domínio livo.com.br NÃO está verificado — nunca usar como remetente.

**Atenção Next.js 16:**

- params em rotas dinâmicas é uma Promise — sempre usar `const { param } = await params` antes de acessar.
- Server Components não aceitam event handlers (onMouseEnter, onClick, etc) — usar classes Tailwind para hover ou criar Client Components.

---

## 3. ESTRUTURA DE PASTAS COMPLETA

raiz/
├── auth.ts ← Config Auth.js v5
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
│ │ Carrega barbearia pelo crachá
│ └── dashboard/
│ ├── page.tsx ← Dashboard principal (KPIs + agenda do dia)
│ ├── actions.ts
│ ├── appointment-actions.tsx
│ ├── agenda/ ← Agenda completa com navegação por data
│ ├── clients/ ← CRM de clientes
│ ├── relatorios/ ← Relatórios mensais
│ ├── settings/
│ │ ├── page.tsx ← Configurações gerais + card link para /acessos
│ │ ├── basic-info-form.tsx
│ │ ├── business-hours-form.tsx
│ │ ├── services-manager.tsx
│ │ └── acessos/ ← Sistema de convites e membros
│ │ ├── page.tsx ← Server component (chama getAcessosData)
│ │ ├── acessos-client.tsx ← UI completa (membros, pendentes, form)
│ │ └── actions.ts ← createInvitationAction, revokeMembershipAction,
│ │ revokeInvitationAction, resendInvitationAction,
│ │ getAcessosData
│ └── assinar/ ← Página de assinatura (Asaas)
├── (onboarding)/
│ └── onboarding/
│ ├── page.tsx ← Formulário enriquecido:
│ │ OBRIGATÓRIOS: nome completo, CPF, data nascimento,
│ │ celular (máscara (00) 00000-0000), nome barbearia, slug
│ │ OPCIONAIS: rua, bairro, CEP (00000-000),
│ │ telefone fixo (00) 0000-0000, cidade
│ ├── actions.ts ← createBarbershop() — cria barbearia + profissional
│ │ + crachá owner em uma única transação
│ │ Recebe e salva todos os novos campos
│ └── data.ts ← PRESET_SERVICES (8 serviços pré-configurados)
├── (legal)/ ← Páginas legais (termos, privacidade)
├── [slug]/ ← Página pública da barbearia (agendamento online)
├── api/
│ ├── auth/[...nextauth]/route.ts
│ └── webhooks/asaas/route.ts
├── convite/
│ └── [token]/ ← Página PÚBLICA de aceite de convite
│ ├── page.tsx ← Valida token, trata todos os estados de erro,
│ │ detecta sessão ativa, usa await params (Next.js 16)
│ ├── accept-form.tsx ← Client component: criar conta OU usar conta existente
│ └── actions.ts ← acceptInvitationAction() — cria Membership em transação
└── vip/ ← Captura de leads pré-lançamento
├── page.tsx
├── vip-form.tsx
└── actions.ts ← createLead() — salva em WaitlistLead
└── lib/
├── db.ts ← PrismaClient singleton
├── email.ts ← sendWelcomeEmail() + sendInvitationEmail()
│ Templates HTML completos dark theme
├── asaas.ts
├── permissions.ts ← RBAC completo
└── plans.ts ← Limites e features por plano

---

## 4. BANCO DE DADOS — SCHEMA COMPLETO

### Tabelas originais:

- **User**: id, name, email, emailVerified, image, password, createdAt, updatedAt
  Relações: accounts[], sessions[], barbershop (owned), memberships[], sentInvitations[]
- **Account**, **Session**, **VerificationToken**: Auth.js padrão
- **Barbershop**: id, name, slug (único), phone, city, state, plan, planStatus, trialEndsAt,
  asaasCustomerId, asaasSubscriptionId, isActive, ownerId (único), createdAt, updatedAt
  Relações: professionals[], services[], appointments[], clients[], businessHours[], memberships[], invitations[]
  ⚠️ O campo city guarda temporariamente o endereço concatenado (rua, bairro, cidade) até o Dia 3
- **Professional**: id, name, bio, avatarUrl, isActive, barbershopId, createdAt, updatedAt
  Relações: appointments[], membership (opcional — one-to-one)
- **Service**: id, name, description, durationMin, priceInCents (centavos!), isActive, barbershopId
- **Appointment**: id, date, endTime, status, notes, clientName, clientPhone, clientEmail,
  barbershopId, professionalId, serviceId, clientId (opcional), createdAt, updatedAt
- **Client**: id, name, phone, email, notes, barbershopId, totalVisits, lastVisitAt, createdAt, updatedAt
  Índice único: [phone, barbershopId]
- **BusinessHour**: id, dayOfWeek (0=dom, 6=sab), openTime, closeTime, isOpen, barbershopId
  Índice único: [dayOfWeek, barbershopId]

### Adicionadas no Dia 1:

- **Membership**: id, role (MemberRole), userId, barbershopId, professionalId (único, opcional),
  commissionOnServices (bool), commissionOnProducts (bool), isActive (bool), createdAt, updatedAt
  Índice único: [userId, barbershopId]
- **Invitation**: id, email, role, token (único), status (InvitationStatus), expiresAt,
  professionalId (opcional, string sem FK), commissionOnServices, commissionOnProducts,
  barbershopId, invitedById (opcional), createdAt, acceptedAt (opcional)
- **WaitlistLead**: id, name, whatsapp, email, barbershopName (opcional), source, createdAt
  ⚠️ TEM 14 REGISTROS REAIS DO WORKSHOP TX — NUNCA DELETAR

### Enums:

```prisma
enum Plan { start, pro, prime }
enum AppointmentStatus { pending, confirmed, completed, cancelled, no_show }
enum MemberRole { owner, reception, barber }
enum InvitationStatus { pending, accepted, revoked, expired }
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
- getCurrentMembership() — busca crachá ativo no banco (sempre fresco). Retorna MembershipContext ou null
- requireMembership() — exige crachá. Sem crachá → redirect("/login")
- requireRole(roles) — exige papel específico. Sem permissão → redirect("/dashboard")
- isOwner(m), canSeeAllClients(m), clientScope(m), appointmentScope(m)

**Padrão de uso:**

```typescript
const membership = await requireMembership(); // qualquer papel
const membership = await requireRole("owner"); // só dono
const membership = await requireRole(["owner", "reception"]);
const clients = await db.client.findMany({ where: clientScope(membership) });
```

### Arquivo: src/lib/plans.ts

```typescript
PLAN_SEAT_LIMITS = { start: 1, pro: 3, prime: Infinity };
PLAN_FEATURES = {
  start: {
    products: false,
    commissions: false,
    multipleProfessionals: false,
    whatsappAssistant: false,
  },
  pro: {
    products: true,
    commissions: true,
    multipleProfessionals: true,
    whatsappAssistant: true,
  },
  prime: {
    products: true,
    commissions: true,
    multipleProfessionals: true,
    whatsappAssistant: true,
  },
};
canAddMember(barbershopId); // async
planHasFeature(plan, feature);
```

---

## 6. REGRAS DE NEGÓCIO DOS ACESSOS

### Os 3 papéis do PRO:

**OWNER (Dono):** acesso total. Convida/revoga membros. Liga/desliga comissionamento por pessoa e tipo. Vê tudo.

**RECEPTION (Recepção):** vê todos os clientes e agendamentos. Remanejamento entre barbeiros. Abre/fecha comandas. Pode ter comissão (se dono habilitar). NÃO acessa financeiro geral, configurações críticas, comissões de outros.

**BARBER (Barbeiro):** escopo restrito ao próprio — só seus clientes, agendamentos, comissões. Sempre tem comissionamento. NÃO vê outros barbeiros, clientes de outros, financeiro global.

### Fluxo de convite (implementado no Dia 2):

1. Dono → /dashboard/settings/acessos → preenche e-mail, papel, profissional (se barber), comissões
2. Sistema verifica: canAddMember(), e-mail já membro, convite pendente, profissional já vinculado
3. Cria Invitation (token UUID, expira 7 dias) no banco
4. Envia e-mail via Resend com link /convite/[token]
5. Convidado acessa link → página valida token e trata todos os estados (not_found, already_used, revoked, expired)
6. Convidado escolhe: criar conta nova OU usar conta existente (detecta sessão ativa)
7. acceptInvitationAction() → cria Membership + marca invitation.accepted em transação única
8. Login automático (se conta nova) + redirect("/dashboard")
9. Dono pode revogar membership (isActive=false) ou convite pendente (status=revoked)
10. Dono pode reenviar convite (novo token + nova expiração + novo e-mail)

### Regras de validação do convite:

- Não pode convidar e-mail já membro ativo da barbearia
- Não pode ter 2 convites pendentes para o mesmo e-mail na mesma barbearia
- PRO = 3 assentos total (dono ocupa 1, sobram 2)
- Não pode vincular profissional que já tem membership ativo ou convite pendente
- Não pode revogar o próprio crachá de dono
- Token inválido/expirado/revogado/já usado → telas de erro específicas

---

## 7. O QUE JÁ ESTÁ CONSTRUÍDO (EM DETALHE)

### ✅ SISTEMA BASE (antes do Dia 1)

- Onboarding inteligente em 2 passos. PRESET_SERVICES com 8 serviços. Horários padrão automáticos. Tudo em transação única.
- Trial de 30 dias automático (trialEndsAt = now + 30 dias).
- Página pública /[slug] — responsiva, agendamento online 3 etapas.
- Dashboard com KPIs em tempo real. Agenda completa com navegação por data.
- Agendamento manual pelo barbeiro (walk-ins e pedidos por telefone).
- CRM automático: todo cliente que agenda é cadastrado/atualizado.
- Configurações: informações básicas, serviços (CRUD completo), horários.
- Relatórios mensais: 6 KPIs, gráfico barras CSS puro, top 5 serviços, 5 clientes fiéis.
- E-mail de confirmação automático via Resend. Disparo assíncrono.
- Sistema de assinatura Asaas: trial, webhook, QR Code PIX, planStatus.

### ✅ DIA 1 — FUNDAÇÃO DE ACESSOS

- Schema: Membership, Invitation, WaitlistLead + migrações rodadas
- Backfill: crachás de dono criados para barbearias existentes (script)
- src/lib/permissions.ts — RBAC completo
- src/lib/plans.ts — limites e features
- Dashboard layout atualizado: busca barbearia pelo crachá (não por ownerId)
- Onboarding atualizado: cria Membership de dono vinculado ao professional.id na mesma transação
- Página VIP /vip: captura leads → WaitlistLead. 14 leads do workshop TX em 31/05/2026.
- Google OAuth corrigido (credenciais limpas no Google Cloud)

### ✅ DIA 2 — SISTEMA DE CONVITES

**Arquivos criados:**

- src/app/(dashboard)/dashboard/settings/acessos/page.tsx — server component
- src/app/(dashboard)/dashboard/settings/acessos/acessos-client.tsx — UI completa:
  - Seção "Membros ativos": avatar, nome, e-mail, badge de papel, tags de comissão, botão revogar
  - Seção "Convites pendentes": e-mail, papel, data expiração, botões reenviar/revogar
  - Formulário de novo convite: e-mail, seletor de papel (Recepção/Barbeiro), select de profissional
    (só aparece se Barbeiro), toggles de comissão em serviços e produtos
  - Contador de assentos (X/3) no header
  - Toast de feedback (sucesso/erro) com auto-dismiss 4s
- src/app/convite/[token]/page.tsx — página pública de aceite
- src/app/convite/[token]/accept-form.tsx — client component do formulário de aceite
- src/app/convite/[token]/actions.ts — acceptInvitationAction()

**Arquivos modificados:**

- src/lib/email.ts — adicionada sendInvitationEmail() com template HTML dark theme completo
- src/app/(dashboard)/dashboard/settings/page.tsx — card "Acessos e membros" com link para /acessos
- src/app/(onboarding)/onboarding/page.tsx — formulário enriquecido com novos campos e máscaras
- src/app/(onboarding)/onboarding/actions.ts — recebe e processa novos campos

**Correções aplicadas durante o Dia 2:**

- RESEND_FROM corrigido de livo.com.br para livobarber.com.br (domínio verificado)
- params com await no convite/[token]/page.tsx (breaking change Next.js 16)
- Filtro de profissionais disponíveis corrigido: usa Set de IDs vinculados em vez de membership: null
- Server Component: removidos event handlers inline, substituídos por classes Tailwind
- Tipo Member no acessos-client.tsx: adicionado campo isActive: boolean

**Máscaras implementadas no onboarding:**

- Celular: (00) 00000-0000 — 11 dígitos
- Telefone fixo: (00) 0000-0000 — 10 dígitos
- CPF: 000.000.000-00 — 11 dígitos
- CEP: 00000-000 — 8 dígitos

### ✅ PÁGINA VIP (/vip)

- Rota pública sem autenticação
- Formulário: nome, WhatsApp (máscara), e-mail, nome barbearia (opcional)
- Verifica duplicata por e-mail (sem duplicar)
- Resultado: 14 leads do workshop TX em 31/05/2026
- QR Code aponta para https://livobarber.com.br/vip

---

## 8. PRÓXIMAS ETAPAS — ROADMAP DETALHADO

### 🔜 DIA 3 — CLIENTES COMPLETOS + ENDEREÇO + MAPA (PRÓXIMO CHAT)

**Migração do banco:**

- User: adicionar cpf (String único por barbearia), birthDate (DateTime)
- Barbershop: adicionar street, neighborhood, cep, state como campos separados
- Migração: npx prisma migrate dev --name endereco_e_dados_dono

**Onboarding:**

- Tornar endereço obrigatório (rua, bairro, CEP, cidade)
- Salvar nos campos corretos após migração
- Validação de CEP

**Google Maps:**

- Na página pública /[slug]: mapa com pin da barbearia
- Na confirmação de agendamento: mini-mapa com endereço clicável
- Usar Google Maps Embed API (sem necessidade de SDK)

**CRM de clientes:**

- Enriquecer model Client: cpf, dataNascimento, street, neighborhood, cep, origem (enum: Indicacao, Google, Instagram, Fachada), bloqueado (bool)
- Tela de clientes com escopo por papel (clientScope)
- Filtro "cliente sumido" (não aparece há X dias configurável)
- Filtro "aniversariantes do mês"

### DIA 4 — AGENDA POR BARBEIRO

- Visão colunar (uma coluna por profissional)
- Cores de status: confirmado=verde, pendente=amarelo, concluído=cinza, cancelado=vermelho
- Remanejar agendamento entre barbeiros (só owner e reception)
- Criar agendamento clicando em slot vazio

### DIA 5 — PRODUTOS & ESTOQUE

- Models: Product (name, category, costPrice, salePrice, stockQty, minStockQty, trackStock,
  commissionEnabled, commissionRule), ProductCategory, StockMovement (IN/OUT/SALE/ADJUST)
- CRUD de produtos e categorias
- Controle de estoque com entrada/saída e alerta de mínimo

### DIA 6 — COMANDAS (PDV)

- Models: Comanda (clientId, professionalId, status: OPEN/PAID/CANCELLED, paymentMethod, total),
  ComandaItem (comandaId, serviceId?, productId?, qty, unitPrice, commission snapshot)
- Fluxo: abrir → adicionar serviços e produtos → fechar com forma de pagamento
- Snapshot de comissão no fechamento
- Caixa básico: listar comandas do dia, total

### DIA 7 — COMISSÕES

- Regras por Membership (% ou valor fixo, por serviço e/ou produto)
- Cálculo no fechamento da comanda
- Relatório por profissional no período
- Fechamento mensal: CommissionStatement

### DIA 8 — DASHBOARDS & RELATÓRIOS

- Dashboard do dono: operacional (hoje) + estratégico (faturamento, ranking)
- Dashboard do barbeiro: métricas próprias, comissão acumulada, gráfico, ranking relativo
- Relatórios por período personalizável

### DIA 9 — PACOTES & MARKETING

- Pacotes (combos): name, price, services[], validade
- ClientPackage: comprado, sessões restantes
- Marketing básico: sumidos, aniversariantes, notificações manuais

### DIA 10 — ACABAMENTO VISUAL

- Dark/light mode com persistência
- Visual premium: Cash Barber + Stripe/Linear
- Microinterações, transições, consistência tipográfica

### DEPOIS (não imediato):

- Assistente IA WhatsApp (Z-API ou Evolution API)
- LIVO PRIME: pagamento online, assinatura de cliente, IA preditiva, campanhas, PWA

---

## 9. PENDÊNCIAS & CUIDADOS

- **CPF e birthDate:** coletados no onboarding (validados no front) mas NÃO salvos no banco ainda.
  O campo cpf não existe no model User. Migração e salvamento no Dia 3.
- **Endereço estruturado:** rua, bairro, CEP coletados no onboarding mas salvos concatenados
  no campo city temporariamente. Dia 3 cria campos separados no schema.
- **Mapa Google Maps:** depende do endereço estruturado. Implementar no Dia 3.
- **Endereço obrigatório:** será obrigatório após migração do Dia 3. Por ora é opcional.
- **professionalId nos crachás:** novos donos saem do onboarding com professionalId correto.
  Crachás antigos corrigidos manualmente via Prisma Studio.
- **Plano START:** mantido no enum para não quebrar migrações. Não é mais vendido.
  Barbearias novas são criadas como start no código e devem ser atualizadas para pro manualmente
  via Prisma Studio até implementarmos automação de planos.
- **Máscaras em todos os campos:** celular (00) 00000-0000, fixo (00) 0000-0000,
  CPF 000.000.000-00, CEP 00000-000. Aplicar em qualquer campo novo.
- **priceInCents:** preços no banco em centavos (inteiro). Sempre converter ao exibir.
- **WaitlistLead:** 14 registros reais do workshop TX. NUNCA deletar. NUNCA incluir em limpezas de banco.
- **RESEND_FROM:** deve ser sempre noreply@livobarber.com.br. Domínio livo.com.br NÃO verificado.
- **Next.js 16 — params como Promise:** sempre `const { param } = await params` em rotas dinâmicas.
- **Next.js 16 — Server Components:** não usar event handlers inline. Usar Tailwind para hover.
- **Windows PowerShell:** usar Select-String no lugar de grep.
- **E-mail profissional:** quando edu@livobarber.com.br existir, atualizar em: Asaas, Vercel,
  GitHub, Neon, Resend, Google Cloud OAuth, RESEND_FROM no .env.local.
- **QR Code VIP:** aponta para https://livobarber.com.br/vip.

---

## 10. MARCA & IDENTIDADE VISUAL

- **Logo:** LIVOTX — "V" e "O" em vermelho #C8102E, "X" em dourado #C8A24C.
  Versão fundo escuro: letras brancas/cinza claro (public/logo.png).
- **Cores principais:**
  - Vermelho: #C8102E (ação principal) e #E0263D (hover)
  - Dourado: #C8A24C (destaque/premium)
  - Fundo: #0B0B0D (geral), #17171C (card), #1F1F27 (card elevado)
  - Borda: #2A2A33
  - Texto: #FFFFFF (principal), #9A9AA6 (secundário), #6E6E78 (terciário)
  - Status: verde #3FB950 (confirmado), amarelo #D4A72C (pendente),
    cinza #5E5E68 (concluído), vermelho #C8102E (cancelado)
- **Visual do sistema:** dark theme com fundo #050505
- **Referência de maturidade:** Cash Barber (organização, hierarquia, densidade de informação)
- **Referência visual:** Stripe / Linear / Notion (beleza, modernidade, premium)
- **Fonte:** Montserrat (PPT e mockups). No sistema: system-ui / Tailwind default.
- **NÃO pode parecer:** projeto iniciante, startup amadora, dashboard genérico, template Bootstrap.

---

## 11. DECISÕES ARQUITETURAIS

### Autenticação

- Auth.js v5, JWT Strategy, roles NÃO armazenados no token
- Motivo: evitar JWT stale (se dono mudar comissão, token desatualizado erraria)
- Solução: 1 query extra por request via getCurrentMembership() — barato com índice

### Membership

- Usuário → Membership → Barbearia (não direto)
- Motivo: permite múltiplas barbearias por usuário no futuro

### Convites

- Token UUID gerado com randomUUID() do Node.js crypto
- Expiração: 7 dias
- Reenvio: gera novo token (invalida o anterior automaticamente)
- Transação: Membership criado + Invitation marcado como accepted em db.$transaction

### Endereço (temporário)

- Campos opcionais do onboarding salvos concatenados em Barbershop.city
- Será migrado para campos separados no Dia 3

### Plano START

- Mantido no enum para não quebrar migrações antigas
- Não é mais comercializado

---

## 12. CHANGELOG

### 31/05/2026

- Criada tabela Membership, Invitation, WaitlistLead
- Implementado RBAC completo (permissions.ts + plans.ts)
- Dashboard layout migrado para busca por crachá
- Onboarding atualizado para criar Membership na transação
- Página VIP publicada

### 01/06/2026

- 14 leads capturados no workshop TX (WaitlistLead)
- Sistema de convites completo (Dia 2):
  - Tela /dashboard/settings/acessos
  - E-mail de convite via Resend
  - Página /convite/[token] com aceite completo
  - Revogar membership e convites pendentes
  - Reenviar convites
- Onboarding enriquecido: nome completo, CPF, data nascimento, celular, endereço opcional
- Correções: RESEND_FROM, params await Next.js 16, filtro de profissionais, Server Components
