# LIVO BARBER — DESIGN SYSTEM

> **Versão:** 2.0 — 2026-06-15  
> **Fonte de verdade:** código real de produção (`globals.css`, componentes, páginas)  
> **Substituiu:** versão 1.0 aspiracional (descolada do código)  
> **Escopo:** tokens canônicos, arquitetura de componentes, layouts, fluxos operacionais

---

## 1. FUNDAMENTOS

### 1.1 Filosofia

O LIVO Barber é um **sistema operacional de barbearia**, não um produto de conteúdo.

Cada pixel responde a uma das três perguntas:
1. **O que está acontecendo agora?** → estados operacionais
2. **O que preciso fazer?** → ações e fluxos
3. **Como está o negócio?** → dados e KPIs

Decoração é ruído. Densidade é respeito ao operador.

**Proibido:**
- Gradientes decorativos sem função de dados
- Animações >200ms sem feedback funcional
- Cards vazios sem empty state contextual
- Ações críticas escondidas em menus quando cabem na superfície
- Ícones sem label em ações primárias

---

### 1.2 Princípios

| Princípio | Regra prática |
|-----------|--------------|
| **Estados antes de estética** | Todo elemento: default, hover, active, disabled, loading, error, empty |
| **Dados como centro** | KPIs em tipografia máxima — são o produto, não decoração |
| **Hierarquia por peso** | `font-black` métricas → `font-bold` headings → `font-medium` labels → `font-normal` corpo |
| **Cor = semântica** | Vermelho: ação/marca. Verde: receita/sucesso. Amarelo: pendente. Cinza: histórico/inativo |
| **Compacidade progressiva** | Desktop: denso. Mobile: expandido. Nunca o contrário. |

---

## 2. TOKENS

### 2.1 Cores

Definidas em `src/app/globals.css` via `@theme inline`. Esta é a **única** fonte canônica.

#### Backgrounds (escuros → claros)

```
--color-background: #050505    ← base absoluta do sistema
--color-surface-1:  #0a0a0a    ← sidebar, cards base
--color-surface-2:  #111111    ← cards elevados, inputs, bg-card-elevated
--color-surface-3:  #1a1a1a    ← hover states, badges
--color-surface-4:  #242424    ← bordas de destaque, tags
```

**Aliases para uso em componentes (via `:root`):**

```css
var(--bg-base)           /* #050505 */
var(--bg-card)           /* surface-1: #0a0a0a */
var(--bg-card-elevated)  /* surface-2: #111111 */
var(--bg-sidebar)        /* #0a0a0a */
var(--bg-input)          /* #111111 */
```

#### Texto

```css
var(--text-primary)    /* #ffffff — headings, dados principais */
var(--text-secondary)  /* #a1a1aa — labels, subtítulos */
var(--text-tertiary)   /* #52525b — placeholders, metadados */
```

#### Marca e Accent

| CSS Var | Valor | Semântica |
|---------|-------|-----------|
| `--color-red` | `#ff2d55` | Marca / CTA principal / ação crítica |
| `--color-red-hover` | `#ff4566` | Hover do primário |
| `--color-red-muted` | `rgba(255,45,85,0.10)` | Background tinted / badge |
| `--color-red-glow` | `rgba(255,45,85,0.30)` | Sombra foco / ativo |
| `--color-cyan` | `#00d4ff` | Clientes / destaque neutro tecnológico |
| `--color-cyan-muted` | `rgba(0,212,255,0.10)` | Badge clientes |
| `--color-purple` | `#7c3aed` | IA (Lívia) / premium |
| `--color-purple-muted` | `rgba(124,58,237,0.10)` | Badge IA |

#### Funcionais (status)

| CSS Var | Valor | Uso |
|---------|-------|-----|
| `--color-success` / `--status-green` | `#00d4a0` | Receita / confirmado / concluído |
| `--color-warning` / `--status-yellow` | `#ffb020` | Pendente / atenção |
| `--color-error` / `--status-red` | `#ff2d55` | Erro / cancelado / crítico |
| `--color-gold` | `#d4af37` | Comissões / plano prime / financeiro destaque |
| `--status-gray` | `#52525b` | Inativo / histórico / no-show |

#### Bordas

```css
--color-border:        rgba(255,255,255,0.06)  /* padrão */
--color-border-strong: rgba(255,255,255,0.12)  /* hover / foco */
```

#### Tema Claro (`data-theme="light"`)

Ativado via `localStorage("livo-theme") = "light"` + `document.documentElement.setAttribute("data-theme", "light")`.

```css
--color-background: #f4f4f5
--color-surface-1: #ffffff
--color-surface-2: #f4f4f5
--color-surface-3: #e4e4e7
--color-border: #e4e4e7
--color-text-primary: #09090b
--color-text-secondary: #52525b
--color-text-tertiary: #a1a1aa
--color-primary: #e0263d  /* mais escuro para contraste no claro */
--status-green: #1a7f37
--status-yellow: #9a6700
```

**Regra:** nunca hardcode valores de cor em componentes. Sempre `var(--...)`.

---

### 2.2 Tipografia

```css
--font-sans:  "Satoshi", "Inter", ui-sans-serif, system-ui, sans-serif  /* principal */
--font-mono:  "JetBrains Mono", ui-monospace, monospace                 /* números, código */
--font-serif: "Instrument Serif", ui-serif, Georgia, serif              /* apenas landing/marketing */
```

#### Escala de uso real

| Uso | Size | Weight | Letter-spacing |
|-----|------|--------|----------------|
| KPI métrica primária | 32px | 900 (black) | -1px |
| KPI métrica secundária | 26px | 900 | -0.5px |
| Page heading | 28px | 900 | -0.5px |
| Section heading | 20–24px | 700 | -0.3px |
| Card heading | 16px | 700 | -0.3px |
| Label / tag uppercase | 12px | 700 | +1px (widest) |
| Body padrão | 14–15px | 500 | 0 |
| Caption / meta | 12px | 400 | 0 |

**Números financeiros:** usar `font-mono` ou `font-feature-settings: "tnum"` para alinhamento tabular em tabelas. Em KPIs isolados: `font-black` com `letterSpacing: -1px`.

---

### 2.3 Radius

```
--radius-sm: 8px    ← inputs, tags, badges, nav items
--radius-md: 12px   ← cards standard, botões, selects (= var(--radius))
--radius-lg: 16px   ← modais, painéis, drawers
24px (rounded-2xl)  ← KPI cards, cards de dashboard (diferenciados intencionalmente)
```

---

### 2.4 Sombras

```css
--shadow-card:  0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)
--shadow-modal: 0 20px 60px rgba(0,0,0,0.8)
```

Tema claro: `rgba(0,0,0,0.08)` e `rgba(0,0,0,0.15)` respectivamente.

---

### 2.5 Transições e Animações

```css
--transition: 150ms ease           /* padrão: hover, border, color */
--ease-livo: cubic-bezier(0.16,1,0.3,1)  /* spring: elementos entrando no viewport */
```

| Duração | Timing | Uso |
|---------|--------|-----|
| 150ms | ease | Mudanças de cor, border, opacity (hover) |
| 200ms | ease | Escala de botões (-translate-y-0.5) |
| 300ms | ease-out | Slide da sidebar mobile |
| ease-livo | spring | Modais, drawers, fadeIn de cards |

Keyframes definidos em `globals.css`:
- `slideInRight` — slide da direita para esquerda (panels)
- `fadeIn` — fade + translateY(8→0) para cards e modais
- `shimmer` — animação de skeleton loading

---

### 2.6 Z-index

```css
--z-overlay: 30  /* backdrop de modal / overlay mobile */
--z-header:  40  /* header mobile sticky */
--z-modal:   50  /* modais, drawers, sidebar mobile */
```

---

### 2.7 Spacing

Base unit: 4px. Escala de 8px para macro layout.

| Tailwind | px | Uso principal |
|----------|----|---------------|
| `gap-1` | 4px | Micro-gap: ícone + dot |
| `gap-2` | 8px | Gap interno de labels |
| `px-3` | 12px | Padding tags/badges |
| `px-4 py-2` | 16/8px | Padding de input |
| `p-5` | 20px | Padding de card |
| `px-6` | 24px | Padding horizontal de seção |
| `py-8` | 32px | Padding vertical de page |

---

## 3. COMPONENTES

### 3.1 Button

Arquivo: `src/components/ui/button.tsx` — CVA + Radix Slot

#### Variantes

| Variante | Visual | Uso |
|----------|--------|-----|
| `primary` | `#ff2d55` sólido + shadow glow | CTAs: "Agendar", "Confirmar", "Salvar" |
| `secondary` | `white/5` + border `white/10` | Ações secundárias: "Cancelar", "Voltar" |
| `ghost` | Transparente → `white/5` hover | Navegação discreta, ações terciárias |
| `outline` | Borda vermelha 30%, fundo transparente | Destaque alternativo, estado selecionado |
| `destructive` | Fundo vermelho 10% + borda 20% | Ações perigosas com confirmação |
| `success` | Fundo verde 10% + borda 20% | "Fechar comanda", "Confirmar pagamento" |
| `link` | Texto vermelho underline | Links inline em parágrafo |

#### Tamanhos

| Size | H | Padding | Uso |
|------|---|---------|-----|
| `xs` | 28px | px-3 | Tags ativas, ações inline em tabelas |
| `sm` | 32px | px-4 | Ações em cards compactos |
| `md` | 40px | px-5 | **Padrão** |
| `lg` | 48px | px-6 | CTAs de página, formulários |
| `xl` | 56px | px-8 | Hero / onboarding |
| `icon` | 40×40 | — | Ícones standalone |
| `icon-sm` | 32×32 | — | Ícones em tabelas e headers |

**Regra de loading:** `disabled` + `isPending` do `useTransition` → mostrar spinner no ícone esquerdo. Nunca deixar botão sem feedback durante server action.

---

### 3.2 Input

Classe: `.livo-input` (CSS global)

```css
background: var(--bg-input)               /* #111111 */
border: 1px solid var(--color-border)     /* rgba(255,255,255,0.06) */
border-radius: var(--radius-md)           /* 12px */
color: var(--text-primary)
font-size: 14px
padding: 10px 16px
```

Estados:
- **focus:** `border-color: var(--border-focus)` = `#ff2d55`
- **error:** `.livo-input--error` → `border-color: var(--status-red)`
- **disabled:** `opacity: 0.5; cursor: not-allowed`
- **placeholder:** `color: var(--text-tertiary)`

---

### 3.3 Badge / Status Tag

Anatomia canônica para status operacionais:

```css
background-color: [color]20       /* 12% opacity */
color: [color]                    /* full */
border: 1px solid [color]40      /* 25% opacity */
border-radius: 9999px             /* pill */
font-size: 11–12px
font-weight: 700
padding: 2px 8px
```

#### Status de Agendamento

| Status | Color token | bg | border |
|--------|-------------|-----|--------|
| `pending` | `--status-yellow` `#ffb020` | `rgba(255,176,32,0.15)` | `rgba(255,176,32,0.40)` |
| `confirmed` | `--color-success` `#00d4a0` | `rgba(0,212,160,0.15)` | `rgba(0,212,160,0.40)` |
| `completed` | `--status-gray` `#52525b` | `rgba(82,82,91,0.20)` | `rgba(82,82,91,0.40)` |
| `cancelled` | `--color-red` `#ff2d55` | `rgba(255,45,85,0.10)` | `rgba(255,45,85,0.30)` |
| `no_show` | `--status-gray` `#52525b` | `rgba(82,82,91,0.15)` | `rgba(82,82,91,0.30)` |

**Nota:** `agenda-board.tsx` usa classes Tailwind (`bg-yellow-500/15`) em vez de CSS variables. Esta é uma inconsistência existente a ser migrada.

---

### 3.4 Modal

Arquivo: `src/components/ui/modal.tsx`

```
Background: var(--bg-card)     /* #0a0a0a */
Shadow: var(--shadow-modal)    /* 0 20px 60px rgba(0,0,0,0.8) */
Border-radius: --radius-lg     /* 16px */
Z-index: --z-modal             /* 50 */
Backdrop: rgba(0,0,0,0.7) backdrop-blur-sm
Animação: fadeIn 200ms ease-livo
Max-width: 480–640px
```

#### Quando usar modal vs alternativas

| Situação | Componente |
|----------|-----------|
| Confirmação de ação destrutiva | Modal (step "confirm" no estado local) |
| Formulário curto ≤4 campos | Modal |
| Seleção de item em lista | Modal |
| Formulário longo >4 campos | Slide-over / Drawer |
| Edição inline de campo único | Inline expand ou popover |
| Detalhes de entidade | Sheet lateral |

**Proibido:** modal dentro de modal. Usar estado local `step: "form" | "confirm"`.

---

### 3.5 Toast

Arquivo: `src/components/ui/toast.tsx` + `ToastProvider` no layout.

```
Posição: bottom-right (bottom-center mobile)
Duração: 3s auto-dismiss
Erros: 5s
Persistentes: sem auto-dismiss
```

Variantes: `success` (borda verde), `error` (borda vermelha), `info` (borda cinza).

---

### 3.6 NavLink

`dashboard-layout-client.tsx`

```css
/* Estado active */
background: var(--color-primary-10)    /* rgba(255,45,85,0.10) */
color: var(--color-primary)
border: 1px solid var(--color-primary-20)
/* dot 6px à direita: background var(--color-primary) */

/* Estado default → hover */
background: transparent → rgba(255,255,255,0.04)
color: var(--text-secondary)
border: 1px solid transparent
icon: var(--text-tertiary)
```

`px-3 py-2.5 rounded-lg text-sm font-medium` — gap 3 entre ícone e label.

---

### 3.7 KPI Card

Padrão dos cards de métricas. Implementado inline no `dashboard/page.tsx`.

```
Container: rounded-2xl p-5 bg-card border-border
├── Label:  text-xs font-bold tracking-widest uppercase text-tertiary
├── Metric: font-black text-[32px] leading-none tracking-[-1px] color=[accent]
└── Sub:    text-xs text-tertiary
```

Cores de métrica por tipo:
- Agendamentos hoje → `--color-primary` (vermelho)
- Receita → `--status-green`
- Clientes → `--color-cyan`
- Período (mês/semana) → `--color-purple`
- Comissão total → `--color-gold`

---

### 3.8 AppointmentRow

Anatomia horizontal usada no dashboard e listas:

```
[TIME 45px] [bar 3px] [AVATAR 36px] [CLIENT + SERVICE] [PRICE + STATUS] [ACTIONS]
```

- **Time:** `min-w-[45px] font-bold text-[13px] text-secondary`
- **Bar:** `w-[3px] rounded-[2px] self-stretch bg-[status-color]`
- **Avatar:** `w-9 h-9 rounded-full bg-card border-[1.5px] border-[status-color] font-bold text-sm`
- **Content:** `flex-1 min-w-0` — cliente: `font-semibold text-sm`, serviço/prof: `text-xs text-tertiary`
- **Price/Status:** `text-right hidden sm:block` — preço: `text-sm font-bold text-secondary`, status: `text-xs [color]`
- **Actions:** `shrink-0` — botões `xs` ou dropdown

---

### 3.9 Skeleton

`src/components/ui/skeleton.tsx`

Animação `shimmer`: gradiente `linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)` deslizando -200% → 200%.

Cor base: `var(--bg-card-elevated)`. Usar em Suspense boundaries.

---

## 4. SIDEBAR

Arquivo: `src/app/(dashboard)/dashboard-layout-client.tsx`

```
Desktop: w-60 (240px) fixed inset-y-0 left-0 bg-sidebar border-right
Mobile:  w-72 fixed z-50 slide-in/out transform (-translate-x-full → translate-x-0)
```

**Anatomia vertical:**

```
┌── Logo section: px-4 py-5 border-bottom
│     └── <Image src="/logo-livo.svg" w=120 h=32>
├── Nav: flex-1 overflow-y-auto px-3 py-4 space-y-1
│     └── NavLink × N (filtrado por role)
└── Footer: px-3 py-4 space-y-1 border-top
      ├── ThemeToggle
      └── SignOut button
```

**Nav items por role:**

| Item | Owner | Reception | Barber |
|------|-------|-----------|--------|
| Início | ✓ | ✓ | ✓ |
| Agenda | ✓ | ✓ | ✓ |
| Clientes | ✓ | ✓ | ✓ |
| Produtos | ✓ | ✓ | — |
| Comandas | ✓ | ✓ | ✓ |
| Comissões | ✓ | ✓ | ✓ |
| Relatórios | ✓ | ✓ | — |
| Marketing | ✓ | ✓ | — |
| Insights | ✓ | — | — |
| Profissionais | ✓ | — | — |
| Configurações | ✓ | — | — |

---

## 5. LAYOUTS DE PÁGINA

### 5.1 Layout Global

```
<html data-theme="dark|light">
  <body bg-base>
    <DashboardLayoutClient>
      <aside>            Sidebar 240px (desktop fixed) / slide-in (mobile)
      <main lg:ml-60>
        <header h-14>    Mobile only: menu + logo + theme toggle
        {children}       Conteúdo da página
        <LiviaBubble>    Fixed bottom-right
      <ToastProvider>    Context wrapper
```

### 5.2 Layout Padrão de Página

```html
<div class="min-h-screen" style="background: var(--bg-base)">
  <!-- Header sticky -->
  <header class="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
          style="background: var(--bg-base); border-bottom: 1px solid var(--border)">
    [Barbershop Name] [Plan Badge]          [User Name]
  </header>

  <!-- Conteúdo -->
  <main class="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
    [Page Title]
    [Content sections]
  </main>
</div>
```

`max-w-6xl` = 1152px. Páginas operacionais (agenda board) usam full-width.

---

### 5.3 Layout: Dashboard Home

```
Header sticky
  → [dot verde] [Nome barbearia] [Plan badge]      [Nome usuário]

Main max-w-6xl px-6 py-8 gap-8
  → Saudação H1 + subtítulo (count hoje)
  → [OnboardingChecklist — se setup incompleto e role=owner]
  → [KPI Grid 2×2 mobile / 4×1 desktop]
       HOJE | RECEITA HOJE | CLIENTES | MÊS
  → [Comissões do barbeiro — se role=barber]
  → [Agenda do dia — card rounded-2xl]
       Header: título + data + count badge
       Body: AppointmentRow list | Empty state contextual
  → [Ações rápidas — grid 3–4 cols]
  → [Analytics owner — se hasRevenueHistory e role=owner]
       KPI grid | Gráfico 12 meses | Top serviços
```

---

### 5.4 Layout: Agenda Operacional

```html
<div class="h-full flex flex-col min-h-0">
  <!-- Subheader -->
  <div class="px-6 py-4 border-bottom">
    "Agenda"  "Visão operacional"     [ViewToggle]
  </div>

  <!-- Board: ocupa exatamente o viewport restante, apenas o board interno scrola -->
  <div class="flex-1 min-h-0 overflow-hidden">
    <AgendaBoard>
      [DateNav ← DATA →]
      [ScrollContainer overflow-auto]
        [TimeColumn] + [ProfessionalColumn × N]
    </AgendaBoard>
  </div>
</div>
```

**Chave:** `h-full flex flex-col min-h-0` — o board ocupa o viewport disponível sem scroll global.

**Grid de slots:**
- `HOUR_START`: 8 (08:00)
- `SLOT_MINUTES`: 10 min por slot
- `SLOT_HEIGHT`: 20px por slot → 1 hora = 120px
- Appointment position: `top = (hora - HOUR_START) × 6 × SLOT_HEIGHT`
- Appointment height: `duracao_min / 10 × 20px`

---

### 5.5 Layout: Comanda PDV

```html
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

  <!-- Coluna items: lg:col-span-2 -->
  <div>
    Header: cliente + status + "Comanda #N"
    Lista items scrollável:
      [TYPE BADGE] [NAME] [QTY × PREÇO] [TOTAL] [REMOVER]
    Botões: [Add Serviço] [Add Produto]
  </div>

  <!-- Coluna sidebar: lg:col-span-1 sticky -->
  <div class="lg:sticky lg:top-20">
    Subtotal: R$ X
    Desconto: input
    ─────────────
    TOTAL: R$ X
    Grid métodos de pagamento 2×4
    [Fechar Comanda — primary xl]
    [Cancelar — destructive sm]
  </div>

</div>
```

**Status da comanda:**
- `open` → `--status-green`
- `closed` → `--text-secondary`
- `cancelled` → `--color-red`

---

### 5.6 Layout: Clientes

```
px-6 py-6 flex-col gap-4
  → [Header: "Clientes" + Button "Novo cliente"]
  → [Filtros: search + selects (origem / sumidos / aniversariantes)]
  → [Stats strip: Total | Bloqueados | Aniversariantes do mês]
  → [Client list]
       [ClientRow: Avatar | Nome+telefone | Última visita | Valor total | Actions]
  → [Pagination]
```

---

### 5.7 Layout: Relatórios

```
px-6 py-6 flex-col gap-6
  → [Header: "Relatórios" + Período select]
  → [KPI Strip 4 cols: Faturamento | Comandas | Ticket médio | Clientes únicos]
  → [Evolução — card full-width com chart de barras]
  → [Grid 2 cols: Top Serviços | Métodos de Pagamento]
  → [Ranking Barbeiros — owner only]
```

---

## 6. FLUXOS OPERACIONAIS

### 6.1 Novo Agendamento

**Trigger:** click em slot vazio no AgendaBoard, ou botão "+" no header da coluna do profissional.

```
1. Modal "Novo Agendamento" abre (z-modal 50)
   Fields:
   ├── Cliente: search → autocomplete via searchClientsForAgenda
   │     "Novo: [digitado]" se não encontrado
   ├── Serviço: <Select> com nome + duração + preço
   ├── Data: pré-preenchida com data do board
   ├── Horário: pré-preenchido com slot clicado
   └── Profissional: pré-preenchido com coluna clicada

2. Submit → createQuickAppointment
   → loading: botão primary disabled + spinner
   → success: modal fecha, router.refresh(), block aparece na grade com fadeIn
   → error: toast error, modal persiste (dados mantidos)
```

---

### 6.2 Abertura de Comanda

**Trigger:** botão "Abrir comanda" no AppointmentCard ou AppointmentRow.

```
1. abrirComanda(appointmentId)
   → verifica comanda existente para o appointment
   → se já existe: router.push('/dashboard/comandas/[id]') (redireciona para a existente)
   → se não existe: cria comanda com serviço do appointment como primeiro item
   → error: toast error inline

2. ComandaPDV carrega:
   - appointment vinculado
   - primeiro item: serviço do agendamento
   - status: open (verde)
```

---

### 6.3 Fechamento de Comanda

**Trigger:** botão "Fechar Comanda" no ComandaPDV.

```
Validação prévia (client-side):
  ├── totalInCents > 0 (pelo menos um item)
  └── paymentMethod selecionado

Modal de confirmação:
  "Fechar comanda — R$ [total formatado]"
  "Método: [método selecionado]"
  [Confirmar — primary] [Cancelar — ghost]

fecharComanda(id, paymentMethod, discountInCents):
  → loading: botões disabled
  → success (transação atômica):
     ├── comanda → status "closed"
     ├── appointment → status "completed"
     ├── estoque decrementado (atomic updateMany WHERE gte)
     ├── comissões calculadas e gravadas por item
     └── router.push('/dashboard/comandas')
  → error: toast error, comanda permanece open
```

---

### 6.4 Atualização de Status de Agendamento

| Status atual | Ações disponíveis | Role mínimo |
|---|---|---|
| `pending` | Confirmar, Cancelar, No-show | owner/reception |
| `confirmed` | Concluir, Cancelar, No-show, Abrir comanda | owner/reception/barber(próprio) |
| `completed` | — | — |
| `cancelled` | — | — |
| `no_show` | — | — |

**Cancelar com comanda associada:** modal com aviso "Isso também cancelará a comanda vinculada."

---

### 6.5 Convite de Membro

```
Owner → /dashboard/settings → Acessos → "Convidar"
Modal: Email + Profissional vinculado + Role
createInvitationAction:
  → verifica limite do plano (canAddMember)
  → gera token UUID com expiração 7 dias
  → envia e-mail via Resend
  → toast "Convite enviado"

Convite listado como "pendente"
Usuário recebe e-mail → /convite/[token]
  → conta existente: vincula membership + auto-login
  → conta nova: formulário de senha → user.create + membership.create + invitation.update (atômico)
```

---

## 7. LÍVIA — INTELIGÊNCIA OPERACIONAL

### 7.1 Posicionamento

A Lívia **não é chatbot**. É uma camada de inteligência contextual que observa o estado da barbearia e entrega insights acionáveis.

### 7.2 Implementação Atual

`src/components/livia-bubble.tsx` — `fixed bottom-6 right-6 z-50`.

- **Fechada:** botão circular com logo da Lívia
- **Aberta:** panel 480×600px com histórico de mensagens, rate-limited (5/min por userId)
- Validação de mensagens: `MAX_MESSAGES=50`, `MAX_CONTENT_LENGTH=4000`, `ALLOWED_ROLES=["user","assistant"]`
- Contexto: dados reais da barbearia (serviços, profissionais, faturamento, agendamentos)

### 7.3 Presença Contextual (Roadmap)

Em vez de chat isolado, insights aparecem como cards dismissíveis nas páginas relevantes:

```
Dashboard  → "3 clientes VIP sem visita há 45+ dias. Ver lista →"
Agenda     → "Sextas 16h–18h com 60% de ociosidade. Ativar promoção?"
Relatórios → "Ticket médio caiu 12% vs mês anterior."
```

Estes insights já existem em `/dashboard/insights` via `recommendation-engine.ts`. A Lívia deveria ser a voz desses dados, não um canal separado.

### 7.4 Regras para futuras implementações

- Nunca criar interface de chat em página própria
- Sempre contextualizar com dados do `barbershopId` correto
- Insights têm `dismissInsight()` — usuário controla o que vê
- Só exibir com dados reais, nunca sugestões genéricas

---

## 8. INCONSISTÊNCIAS DOCUMENTADAS

| Local | Inconsistência | Status |
|-------|----------------|--------|
| `agenda-board.tsx` STATUS_CONFIG | `bg-yellow-500/15`, `text-yellow-400` (Tailwind) vs `var(--status-*)` | Migrar na próxima sprint |
| `button.tsx` | `#FF2D55` hardcoded (CVA precisa de literal em `bg-[]`) | Aceito — limitação da biblioteca |
| Dashboard action cards | Emojis como ícones (`📊 👥 ✦`) vs Lucide icons | Migrar em próxima revisão |
| `rounded-2xl` em KPI cards | 24px vs `--radius: 12px` global | Intencional — documentado |

---

## 9. PADRÕES PROIBIDOS

```
❌ Cores hardcoded: #333, #fff, rgb(0,0,0) — usar var(--)
❌ opacity-50 como único indicador de disabled — usar pointer-events-none + opacity-40
❌ alert() / confirm() nativos — usar Modal com step de confirmação
❌ setTimeout para fechar toast/modal — usar prop de duração ou onAnimationEnd
❌ Emojis como ícones em UI operacional — usar lucide-react
❌ z-index arbitrários (z-100, z-999) — usar escala: 30/40/50
❌ font-size < 12px em textos legíveis
❌ Modal dentro de modal — usar step local no state
❌ Polling para dados em tempo real — usar router.refresh() após server action
❌ Chamar server action sem feedback visual (useTransition + loading state)
❌ barbershopId vindo do input do cliente — sempre de requireMembership()
```

---

## 10. CHECKLIST DE IMPLEMENTAÇÃO

Para cada novo componente ou página:

- [ ] Usa CSS variables em vez de valores hardcoded
- [ ] Funciona em dark E light mode (`data-theme="light"`)
- [ ] Tem estados: default, hover, active, disabled, loading, error, empty
- [ ] Mobile responsivo (scroll horizontal, stack vertical, truncate)
- [ ] RBAC verificado no server (`requireRole`, `requireMembership`)
- [ ] `barbershopId` derivado do membership — nunca do client input
- [ ] `useTransition` para server actions com `disabled` + loading no botão
- [ ] Toast de sucesso/erro para ações que modificam dados
- [ ] `revalidatePath` chamado após mutações
- [ ] Skeleton (Suspense) para conteúdo assíncrono

---

## 11. ROADMAP DE DESIGN TÉCNICO

### Sprint 1 — Consistência (2–4h)
- [ ] Migrar `STATUS_CONFIG` do agenda-board de Tailwind para `var(--status-*)`
- [ ] Criar componente `<StatusBadge status={...} />` reutilizável
- [ ] Substituir emojis nas quick-actions do dashboard por Lucide icons

### Sprint 2 — Densidade (4–8h)
- [ ] Adicionar sparkline inline nos KPI cards (micro-gráfico de tendência)
- [ ] Coluna de valor total (`totalInCents` CRM) em Client list
- [ ] Timeline com horas visíveis na coluna fixa do AgendaBoard

### Sprint 3 — Inteligência (8–16h)
- [ ] Cards de insight contextuais por página (conectar `recommendation-engine.ts`)
- [ ] Badge de notificação no LiviaBubble para novos insights não lidos
- [ ] Painel lateral de insights na Agenda (ex: "Próximo slot livre: 14:30")

### Sprint 4 — Multi-profissional público (8–12h)
- [ ] Seleção de profissional na página pública `/[slug]/book`
- [ ] Foto do profissional (`avatarUrl` já existe no schema)
- [ ] Horários por profissional na página pública

---

*Documento derivado de leitura direta do código de produção. Qualquer divergência: o código vence — este documento deve ser atualizado para refletir o estado real.*
