# MODAL_INVENTORY — LIVO Dashboard
> Gerado em: 2026-06-15  
> Escopo: `src/app/(dashboard)/` e `src/components/`  
> Propósito: GAP-UX-02-D Tarefa A — inventário pré-migração, sem edições de código.

---

## TABELA RESUMO

| # | Modal | Arquivo | Fn:linha | Tamanho | Footer | Especial |
|---|-------|---------|----------|---------|--------|---------|
| 01 | AppointmentStatusModal | `appointment-actions.tsx` | `AppointmentActions:26` / `<Modal:152` | sm 448px | Voltar + Ação (cor dinâmica) | 3 variantes de cor por status |
| 02 | NovoClienteModal | `clients-client.tsx` | `<Modal:288` | md 512px | Cancelar + Cadastrar cliente | Loading, error inline |
| 03 | EditarClienteModal | `clients-client.tsx` | `<Modal:451` | md 512px | Cancelar + Salvar alterações | Loading, campos de endereço extras |
| 04 | AppointmentModal | `agenda-board.tsx` | `AppointmentModal:780` | md 512px | Múltiplos condicionais | Botões variam por role + status |
| 05 | EditAppointmentModal | `agenda-board.tsx` | `EditAppointmentModal:1116` | md 512px | Salvar alterações (sem Cancelar) | Time preview, disabled até válido |
| 06 | MoveModal | `agenda-board.tsx` | `MoveModal:1026` | sm 448px | Nenhum | Lista de profissionais = ação direta |
| 07 | NewAppointmentModal | `agenda-board.tsx` | `NewAppointmentModal:1313` | md 512px | Criar agendamento | Autocomplete + modo manual, time preview |
| 08 | FecharComandaModal | `comanda-pdv.tsx` | `<Modal:832` | md 512px | Voltar + Confirmar · R$ X,XX | Grid 2×4 métodos de pagamento, desconto live |
| 09 | CancelarComandaModal | `comanda-pdv.tsx` | `<Modal:960` | sm 448px | Voltar + Cancelar Comanda | Description varia por status da comanda |
| 10 | ComissaoModal | `comissoes-client.tsx` | `<Modal:518` | sm 448px | Cancelar + Salvar (right-aligned) | Campos condicionais por checkbox |
| 11 | CategoryModal | `produtos-client.tsx` | `CategoryModal:79` | sm 448px | Cancelar + Salvar | Enter submits, error via prop do Input |
| 12 | ProductModal | `produtos-client.tsx` | `ProductModal:149` | md 512px | Cancelar + Salvar | Campos condicionais create vs edit, toggle ativo |
| 13 | StockModal | `produtos-client.tsx` | `StockModal:364` | md 512px | Cancelar + Registrar | Toggle entrada/saída, histórico lazy-load |
| 14 | ProfessionalModal | `profissionais-client.tsx` | `ProfessionalModal:71` | sm 448px | Cancelar + Salvar | Enter submits, bio usa `<textarea>` raw |
| 15 | ConfirmDeactivateModal | `profissionais-client.tsx` | `ConfirmDeactivateModal:178` | sm 448px | Cancelar + Desativar mesmo assim | Warning com contagem de agendamentos futuros |
| 16 | ConfirmDeleteModal | `profissionais-client.tsx` | `ConfirmDeleteModal:240` | sm 448px | Cancelar + Excluir permanentemente | Ação irreversível, sem loading |
| 17 | InviteModal | `profissionais-client.tsx` | `InviteModal:297` | sm 448px | Cancelar + Enviar convite | Enter submits, checkboxes de comissão |

**Total: 17 modais usando `<Modal>` do shared component.**

---

## SEÇÃO DETALHADA

---

### 01 · AppointmentStatusModal
**Arquivo:** `src/app/(dashboard)/dashboard/appointment-actions.tsx:152`  
**Componente:** inline em `AppointmentActions`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** Dinâmicos — `modal.message` (e.g. "Marcar como concluído?") / `modal.subtext` (e.g. "O atendimento será registrado como finalizado.")
3. **Footer:** 2 botões full-width em `flex gap-3`
   - "Voltar" → `background: rgba(255,255,255,0.06)` (secundário)
   - Ação dinâmica (label em `modal.btnLabel`) → `background: modal.color` com box-shadow colorido
   - Cores por status: completed=`var(--status-green)`, cancelled=`var(--color-primary)`, no_show=`var(--status-yellow)`
4. **Fechar:** X (Modal), ESC (Modal), backdrop click (Modal)
5. **Scroll:** Conteúdo mínimo — não necessita scroll
6. **Especial:** 3 variantes visuais controladas por `ConfirmModal.status`; ícone centralizado (✓ / ✕ / !) com cor dinâmica. Ao confirmar, fecha o modal antes de executar a transição (`closeModal()` → `startTransition`).
7. **Controle:** `useState<ConfirmModal | null>(null)` — `modal` é `null` quando fechado

---

### 02 · NovoClienteModal
**Arquivo:** `src/app/(dashboard)/dashboard/clients/clients-client.tsx:288`  
**Componente:** inline em `ClientsClient`

1. **Tamanho:** sem `size` prop → padrão `"md"` → 512px
2. **Título/Descrição:** "Novo cliente" / "Cadastro manual na sua base"
3. **Footer:** 2 botões full-width
   - "Cancelar" → estilo secundário (bg-base + border)
   - "Cadastrar cliente" / "Cadastrando..." → `var(--color-primary)`, hover `var(--color-primary-hover)`, `disabled` quando `modalLoading`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Modal cresce com conteúdo; se ultrapassar 90vh o Modal interno faz overflow-y: auto
6. **Especial:**
   - Grid 2 colunas para campos (col-span-2 nos que ocupam linha inteira)
   - Campos: nome, telefone, e-mail, CPF, data nascimento, origem (Select), notas (Textarea)
   - Error block inline acima do footer (`modalError`)
   - `onMouseEnter/Leave` manual nos botões (não usa className hover)
7. **Controle:** `useState(false)` → `showModal`; abre via `openModal()`, fecha via `closeModal()`

---

### 03 · EditarClienteModal
**Arquivo:** `src/app/(dashboard)/dashboard/clients/clients-client.tsx:451`  
**Componente:** inline em `ClientsClient`

1. **Tamanho:** sem `size` prop → padrão `"md"` → 512px
2. **Título/Descrição:** "Editar cliente" / "Atualiza os dados do cadastro"
3. **Footer:** 2 botões full-width
   - "Cancelar" → secundário
   - "Salvar alterações" / "Salvando..." → `var(--color-primary)`, `disabled` quando `editLoading`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Cresce com conteúdo; overflow-y: auto via Modal quando > 90vh
6. **Especial:**
   - Campos adicionais vs criação: rua, bairro, CEP
   - Total de 11 campos (incluindo textarea de notas e select de origem)
   - Error block inline
   - `onMouseEnter/Leave` manual nos botões
7. **Controle:** `useState<Client | null>(null)` → `editingClient`; `!!editingClient` é o `open` prop

---

### 04 · AppointmentModal
**Arquivo:** `src/app/(dashboard)/dashboard/agenda/agenda-board.tsx:780`  
**Componente:** `function AppointmentModal`

1. **Tamanho:** `size="md"` → 512px
2. **Título/Descrição:** `appointment.clientName` / `cfg.label` (label do status atual)
3. **Footer:** Não há um footer fixo — botões de ação são renderizados dentro do `children` condicionalmente:
   - "Ver Comanda" (primary, link) — se `comandaId` existe e não cancelado
   - "Abrir Comanda" (primary) — se sem comanda e status pending/confirmed
   - "✓ Confirmar agendamento" (green) — se status pending
   - "Marcar como concluído" (secundário) — se pending/confirmed
   - "Não compareceu" (secundário) — se pending/confirmed
   - "Cancelar" (red) — se pending/confirmed
   - "Editar agendamento" (borda, hover primary) — se não completed/cancelled/no_show
   - "Mover para outro barbeiro" (borda) — se owner/reception e não completed/cancelled
   - Todos `disabled` quando `isPending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Cresce com os botões; overflow via Modal
6. **Especial:** Todos os botões condicionais — combinação de `userRole` × `appointment.status` × `appointment.comandaId` determina quais aparecem. `onAbrirComanda` faz redirect para `/dashboard/comandas/[id]` via `NEXT_REDIRECT`.
7. **Controle:** `useState<ModalState>({ type: "none" })` — union discriminada; `{ type: "appointment", appointment }` abre este modal

---

### 05 · EditAppointmentModal
**Arquivo:** `src/app/(dashboard)/dashboard/agenda/agenda-board.tsx:1116`  
**Componente:** `function EditAppointmentModal`

1. **Tamanho:** `size="md"` → 512px
2. **Título/Descrição:** "Editar agendamento" / `appointment.clientName`
3. **Footer:** 1 botão full-width ("Salvar alterações" / "Salvando..."), sem botão Cancelar explícito (usuário fecha pelo X)
   - Disabled quando `isPending` ou campos obrigatórios vazios
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Cresce com conteúdo; overflow via Modal se necessário
6. **Especial:**
   - Preview em tempo real: "HH:MM → termina ~HH:MM · Xmin · R$ Y,YY"
   - Select de horário com todos os slots do dia
   - Grid 2 colunas para data + horário
   - Botão submit tem validação múltipla inline
7. **Controle:** Mesma `ModalState` union; `{ type: "edit", appointment }` abre este

---

### 06 · MoveModal
**Arquivo:** `src/app/(dashboard)/dashboard/agenda/agenda-board.tsx:1026`  
**Componente:** `function MoveModal`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Mover agendamento" / sem descrição
3. **Footer:** Nenhum botão de footer — os profissionais na lista são o próprio gatilho de ação. Fechar pelo X/ESC.
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Scroll interno via Modal se lista > 90vh (improvável)
6. **Especial:**
   - Lista de profissionais (excluindo o atual) como botões clicáveis — ao clicar chama `onMove(prof.id)` imediatamente
   - Estado vazio: "Não há outros profissionais disponíveis."
   - `disabled` + opacity durante `isPending`
   - Hover: bordas e bg em `var(--color-primary)`
7. **Controle:** `ModalState` union; `{ type: "move", appointment }` abre este

---

### 07 · NewAppointmentModal
**Arquivo:** `src/app/(dashboard)/dashboard/agenda/agenda-board.tsx:1313`  
**Componente:** `function NewAppointmentModal`

1. **Tamanho:** `size="md"` → 512px
2. **Título/Descrição:** "Novo agendamento" / `"HH:MM — {profissional.name}"`
3. **Footer:** 1 botão full-width ("Criar agendamento" / "Criando...")
   - `canSubmit` = `!isPending && !!serviceId && !!clientName && !!clientPhone`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Overflow via Modal se conteúdo > 90vh
6. **Especial:**
   - Campo cliente tem 3 estados: (a) busca com autocomplete (dropdown lazy), (b) chip do cliente selecionado + X, (c) modo manual com name+phone livres
   - "Nenhum cliente encontrado" no dropdown abre modo manual
   - Busca usa debounce 300ms + `searchClientsForAgenda` server action
   - Preview de horário de término calculado no cliente
   - Barbeiro select só aparece quando há >1 profissional visível
   - `useRef` para debounce timeout
7. **Controle:** `ModalState` union; `{ type: "new", professionalId, slotIndex, dateKey }` abre este

---

### 08 · FecharComandaModal
**Arquivo:** `src/app/(dashboard)/dashboard/comandas/[id]/comanda-pdv.tsx:832`  
**Componente:** inline em `ComandaPDV`

1. **Tamanho:** `size="md"` → 512px
2. **Título/Descrição:** "Fechar Comanda" / "Confirme a forma de pagamento e desconto (se houver)."
3. **Footer:** 2 botões full-width
   - "Voltar" → fecha modal + limpa erro
   - `"Confirmar · R$ X,XX"` / "Fechando..." → `var(--status-green)`, `disabled` quando `isPending`
   - Valor no label do botão atualiza ao vivo conforme desconto
4. **Fechar:** X, ESC, backdrop click (X também limpa `error`)
5. **Scroll:** Overflow via Modal — conteúdo pode ser extenso (8 métodos de pagamento)
6. **Especial:**
   - Resumo subtotal / desconto / total no topo
   - Input de desconto em R$ (parseado na hora)
   - Grid 2×4 de botões de método de pagamento (cash, pix, credit_card, debit_card, voucher, cortesia, convenio, outros) — seleção visual com borda primária
   - Cálculo de `totalLiquido` em tempo real conforme `discountStr` muda
   - Error block renderizado acima do footer quando presente
7. **Controle:** `useState(false)` → `showCloseModal`

---

### 09 · CancelarComandaModal
**Arquivo:** `src/app/(dashboard)/dashboard/comandas/[id]/comanda-pdv.tsx:960`  
**Componente:** inline em `ComandaPDV`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Cancelar Comanda" / dinâmica:
   - Se `status === "closed"`: "Esta comanda já foi fechada. Cancelar vai estornar o estoque dos produtos. Tem certeza?"
   - Caso contrário: "Tem certeza que deseja cancelar esta comanda? Esta ação não pode ser desfeita."
3. **Footer:** 2 botões full-width
   - "Voltar" → fecha modal
   - "Cancelar Comanda" / "Cancelando..." → `var(--color-primary)` (vermelho), `disabled` quando `isPending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo mínimo — não necessita scroll
6. **Especial:** Ação destrutiva; apenas os 2 botões no children (description carrega o aviso). Description varia para alertar sobre estorno de estoque quando comanda já fechada.
7. **Controle:** `useState(false)` → `showCancelModal`

---

### 10 · ComissaoModal
**Arquivo:** `src/app/(dashboard)/dashboard/comissoes/comissoes-client.tsx:518`  
**Componente:** inline em `ComissoesClient`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** `"Comissão — {professional.name}"` / "Configure o percentual de comissão para cada tipo de item."
3. **Footer:** 2 botões `justify-end` (não full-width)
   - "Cancelar" → `var(--bg-card-elevated)` + border
   - "Salvar" / "Salvando..." → `var(--color-primary)`, `disabled` quando `saving`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Raramente necessário; Modal lida com overflow
6. **Especial:**
   - 2 checkboxes: "Comissão em Serviços" + "Comissão em Produtos"
   - Cada checkbox mostra condicionalmente um `<Input>` de percentual quando marcado
   - Error block com ícone ⚠️
   - Footer com `justify-end` em vez do padrão `gap-3` full-width
7. **Controle:** `useState<MembershipPct | null>(null)` → `editingMembership`

---

### 11 · CategoryModal
**Arquivo:** `src/app/(dashboard)/dashboard/produtos/produtos-client.tsx:79`  
**Componente:** `function CategoryModal`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Editar Categoria" ou "Nova Categoria" / sem descrição
3. **Footer:** 2 botões full-width
   - "Cancelar" → borda + texto secundário
   - "Salvar" / "Salvando..." → `var(--color-primary)`, `disabled` quando `pending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo mínimo
6. **Especial:**
   - Único campo: Input com `autoFocus` e `onKeyDown Enter → handleSubmit`
   - Usa `error={error || undefined}` prop do `<Input>` (renderização integrada de erro — não tem bloco separado)
7. **Controle:** `useState(false)` → `showCategoryModal`; `useState<CategoryWithCount | undefined>()` → `editingCategory`; montado condicionalmente (`{showCategoryModal && <CategoryModal .../>}`)

---

### 12 · ProductModal
**Arquivo:** `src/app/(dashboard)/dashboard/produtos/produtos-client.tsx:149`  
**Componente:** `function ProductModal`

1. **Tamanho:** `size="md"` → 512px
2. **Título/Descrição:** "Editar Produto" ou "Novo Produto" / sem descrição
3. **Footer:** 2 botões full-width
   - "Cancelar" → borda + texto secundário
   - "Salvar" / "Salvando..." → `var(--color-primary)`, `disabled` quando `pending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo pode ser extenso; overflow via Modal
6. **Especial:**
   - Campos condicionais por modo:
     - **Criar:** estoque inicial + alerta mínimo visíveis
     - **Editar:** apenas alerta mínimo + toggle "Produto ativo" (ToggleRight/ToggleLeft)
   - Input monetário com máscara manual (`handleMoneyInput` → digits → formato "0,00")
   - `autoFocus` no campo nome
   - Error como `<p>` abaixo do space-y-4
7. **Controle:** `useState(false)` → `showProductModal`; `useState<ProductWithCategory | undefined>()` → `editingProduct`; montado condicionalmente

---

### 13 · StockModal
**Arquivo:** `src/app/(dashboard)/dashboard/produtos/produtos-client.tsx:364`  
**Componente:** `function StockModal`

1. **Tamanho:** `size="md"` → 512px
2. **Título/Descrição:** "Movimentar Estoque" / `product.name`
3. **Footer:** 2 botões full-width (dentro do children, antes da seção de histórico)
   - "Cancelar" → borda + texto secundário
   - "Registrar" / "Salvando..." → `var(--color-primary)`, `disabled` quando `pending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Modal pode crescer bastante quando histórico carregado; `max-h-48 overflow-y-auto` interno para lista do histórico; Modal geral tem `maxHeight: 90vh overflow-y: auto`
6. **Especial:**
   - Exibe estoque atual no topo
   - Toggle visual Entrada / Saída (muda ícone, cor, e lista de `reason` disponíveis)
   - Histórico lazy-load: botão "Ver histórico" que ao clicar faz `getStockMovements(product.id)` e renderiza lista com `max-h-48` scrollável
   - `autoFocus` no input de quantidade
7. **Controle:** `useState<ProductWithCategory | undefined>()` → `stockProduct`; montado condicionalmente

---

### 14 · ProfessionalModal
**Arquivo:** `src/app/(dashboard)/dashboard/profissionais/profissionais-client.tsx:71`  
**Componente:** `function ProfessionalModal`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Editar Profissional" ou "Novo Profissional" / sem descrição
3. **Footer:** 2 botões full-width
   - "Cancelar" → borda + texto secundário
   - "Salvar" / "Salvando..." → `var(--color-primary)`, `disabled` quando `pending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo mínimo
6. **Especial:**
   - `<Input>` para nome com `onKeyDown Enter → handleSubmit`
   - Bio usa `<textarea className="livo-input" style={{ resize: "vertical" }}>` — NÃO usa o componente `<Input>` (pendência de migração)
   - Contador de caracteres da bio (`{bio.length}/500`) à direita
   - Error como `<p className="text-sm text-red-400">`
7. **Controle:** `useState(false)` → `showModal`; `useState<ProfessionalWithDetails | undefined>()` → `editingProfessional`; montado condicionalmente

---

### 15 · ConfirmDeactivateModal
**Arquivo:** `src/app/(dashboard)/dashboard/profissionais/profissionais-client.tsx:178`  
**Componente:** `function ConfirmDeactivateModal`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Desativar profissional?" / sem descrição
3. **Footer:** 2 botões full-width
   - "Cancelar" → borda + texto secundário
   - "Desativar mesmo assim" → `var(--status-red)`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo mínimo
6. **Especial:**
   - Warning box amarela com contagem dinâmica de `futureCount` agendamentos futuros
   - Pluralização correta ("agendamento" vs "agendamentos")
   - Sem loading state (ação é rápida; toggle lida com pending fora do modal)
7. **Controle:** `useState<string | null>(null)` → `confirmToggleId`; montado condicionalmente

---

### 16 · ConfirmDeleteModal
**Arquivo:** `src/app/(dashboard)/dashboard/profissionais/profissionais-client.tsx:240`  
**Componente:** `function ConfirmDeleteModal`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Excluir profissional?" / sem descrição
3. **Footer:** 2 botões full-width
   - "Cancelar" → borda + texto secundário
   - "Excluir permanentemente" → `var(--status-red)`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo mínimo
6. **Especial:**
   - Warning box vermelha com `professionalName` em bold e aviso de irreversibilidade
   - Aviso adicional: se tiver histórico, exclusão será bloqueada automaticamente
   - Sem loading state
7. **Controle:** `useState<string | null>(null)` → `showConfirmDeleteId`; montado condicionalmente

---

### 17 · InviteModal
**Arquivo:** `src/app/(dashboard)/dashboard/profissionais/profissionais-client.tsx:297`  
**Componente:** `function InviteModal`

1. **Tamanho:** `size="sm"` → 448px
2. **Título/Descrição:** "Convidar por e-mail" / `professional.name`
3. **Footer:** 2 botões full-width
   - "Cancelar" → borda + texto secundário
   - "Enviar convite" / "Enviando..." → `var(--color-primary)`, `disabled` quando `pending`
4. **Fechar:** X, ESC, backdrop click
5. **Scroll:** Conteúdo cabe sem scroll
6. **Especial:**
   - `<Input>` de e-mail com `onKeyDown Enter → handleSubmit`
   - Painel de comissões com 2 checkboxes (`accent-[var(--color-primary)]`) — usa `<input type="checkbox">` raw, não componente
   - Error como `<p className="text-sm text-red-400">`
   - Invocado também a partir de `profissionais-client.tsx` — reutiliza a action `createInvitationAction` que também existe em `acessos-client.tsx`
7. **Controle:** `useState<string | null>(null)` → `showInviteForId`; profissional derivado com `data.find(p => p.id === showInviteForId)`; montado condicionalmente

---

## OVERLAYS CUSTOMIZADOS (não usam `<Modal>`)

### DayPanel
**Arquivo:** `src/components/day-panel.tsx:51`

- **Estrutura:** overlay fixo `inset-0` (backdrop) + painel `fixed right-0 top-0 h-full` (lateral direito)
- **Largura:** `min(420px, 100vw)`
- **Fechar:** ESC (`useEffect + window.addEventListener`), click no backdrop (`onClick={onClose}`)
- **X:** botão no header com `aria-label="Fechar painel"`
- **Scroll:** `flex-1 overflow-y-auto` na lista de agendamentos
- **Footer:** total de agendamentos + soma de valores (excluindo cancelled/no_show), só aparece quando há itens
- **Especial:** `useEffect` dá foco no painel ao abrir; não usa `--z-modal` (usa z-40/z-50 direto)
- **Onde é usado:** não observado nas leituras atuais — provavelmente em `/dashboard/relatorios` ou página de calendário

### LiviaBubble
**Arquivo:** `src/components/livia-bubble.tsx:114`

- **Estrutura:** botão flutuante `fixed bottom-6 right-6 z-50` + janela de chat `fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px]`
- **Altura máxima:** `max-height: 520px` — mensagens em `max-height: 340px overflow-y-auto`
- **Fechar:** botão X no header do chat; backdrop NÃO fecha (não é um modal bloqueante)
- **Especial:** animação `liviaSlideUp` na abertura, pulsação `liviaPulse` no botão quando fechado; greeting message fixo; sugestões iniciais; chat history em memória; integra com `/api/livia`
- **Onde é usado:** `DashboardLayoutClient` — presente em TODAS as páginas do dashboard

---

## PADRÕES RECORRENTES

### Tamanhos Utilizados

| Tamanho | maxWidth | Usos | Contexto típico |
|---------|----------|------|----------------|
| `sm` | 448px | 11 modais (01,06,09,10,11,14,15,16,17 + MoveModal) | Confirmações, formulários simples (1-2 campos) |
| `md` | 512px | 8 modais (02,03,04,05,07,08,12,13) | Formulários multi-campo, detalhes, PDV |
| `lg` | 640px | 0 modais | Não utilizado em nenhum modal atual |

**Conclusão:** `lg` está declarado no componente mas nunca usado. Candidato a extensão futura (ex: modal de relatório, exportação, visualização ampla).

---

### Footer: Padrões de Botão

**Padrão A — 2 botões full-width (flex-1)** — 13 modais  
`[Cancelar/Voltar]` + `[Ação primária]`  
Layout: `flex gap-3` dentro do children do Modal.

**Padrão B — 1 botão full-width** — 2 modais (EditAppointmentModal, NewAppointmentModal)  
Só o botão de submit. Fechar usa o X do header.

**Padrão C — Botões right-aligned (justify-end)** — 1 modal (ComissaoModal)  
`flex gap-3 justify-end` — botões menores, não full-width.

**Padrão D — Sem botões de footer** — 1 modal (MoveModal)  
Lista de itens clicáveis substitui a ação.

**Padrão E — Múltiplos condicionais** — 1 modal (AppointmentModal)  
Até 7 botões renderizados condicionalmente por role + status.

**Observação:** O `<Modal>` não renderiza nenhum footer — todos os botões ficam dentro de `children`. Não existe uma prop `footer`, `actions`, ou `onConfirm`. Isso significa que cada modal duplica a estrutura do footer.

---

### Loading State nos Botões

- Padrão universal: `disabled={isPending/loading/saving}` + texto alternativo ("Salvando...", "Enviando...", "Cadastrando...", "Criando...", "Registrando...")
- Todos usam `disabled:opacity-50` via className
- Nenhum usa spinner dentro do botão
- `isPending` vem de `useTransition()` em 8 modais; `useState(false)` em 3; ambos em 2

---

### Controle de Abertura/Fechamento

| Padrão | Modais | Exemplo |
|--------|--------|---------|
| `useState(false)` simples | 6 | CategoryModal, ProductModal, showCloseModal |
| `useState<T \| null>(null)` | 7 | editingClient, editingMembership, confirmToggleId |
| `useState<T \| undefined>()` | 3 | editingProduct, stockProduct, editingProfessional |
| Union discriminada (`ModalState`) | 4 | Todos os 4 modais da agenda-board |

---

### Montagem Condicional vs `open` Prop

**Montagem condicional** (`{condition && <Modal ...>}`): 8 modais  
— Modal nunca monta quando fechado; sem animação de saída; state interno reseta ao reabrir.  
Exemplos: CategoryModal, ProductModal, StockModal, ProfessionalModal, ConfirmDeactivate, ConfirmDelete, InviteModal, AppointmentModal(agenda)

**`open` prop** (`<Modal open={condition}>`): 7 modais  
— Modal sempre montado; state interno persiste entre aberturas; Modal usa a prop para renderizar ou não o overlay.  
Exemplos: AppointmentStatusModal, NovoClienteModal, EditarClienteModal, FecharComandaModal, CancelarComandaModal, ComissaoModal, EditarClienteModal

---

### Comportamentos Especiais Recorrentes

| Comportamento | Ocorrências | Modais |
|---------------|-------------|--------|
| Loading state no botão primário | 12 | 01,02,03,05,07,08,09,10,11,12,13,14,17 |
| Error block inline dentro do modal | 8 | 02,03,10,12,13,14,16,17 |
| Enter key submits | 4 | CategoryModal, ProductModal, ProfessionalModal, InviteModal |
| autoFocus no primeiro campo | 4 | CategoryModal, ProductModal, StockModal, InviteModal |
| Confirmação destrutiva (ação irreversível) | 3 | CancelarComandaModal, ConfirmDeactivateModal, ConfirmDeleteModal |
| Campos condicionais (create vs edit) | 3 | ProductModal, ProfessionalModal, AppointmentModal |
| Preview em tempo real | 2 | FecharComandaModal (total), Edit/NewAppointmentModal (horário) |
| Lazy-load dentro do modal | 1 | StockModal (histórico) |
| Grid de seleção visual | 1 | FecharComandaModal (métodos de pagamento) |
| Autocomplete com busca | 1 | NewAppointmentModal (cliente) |

---

### Sugestão de Variações de API para `<Modal>`

Com base nos padrões encontrados, as seguintes adições ao `<Modal>` reduziram duplicação sem breaking change:

```typescript
// Props opcionais que cobrem ~80% dos footers existentes
interface ModalProps {
  // ... props atuais ...
  
  // Footer declarativo (alternativa a colocar botões em children)
  footer?: {
    cancel?: { label?: string; onClick?: () => void }; // default: "Cancelar" → onClose
    confirm?: {
      label: string;
      onClick: () => void;
      loading?: boolean;
      loadingLabel?: string;
      variant?: "primary" | "danger" | "success"; // default "primary"
      disabled?: boolean;
    };
  };
}
```

**Impacto estimado:** 13 dos 17 modais (Padrão A) se beneficiariam da prop `footer`. Padrões B, C, D, E continuariam usando `children` diretamente.

---

## OBSERVAÇÕES GERAIS

1. **`dashboard-layout-client.tsx`** — exibida no grep mas é um **drawer mobile** da sidebar de navegação (não um modal). ESC fecha, backdrop fecha. **Excluída do inventário de modais.**

2. **`navbar.tsx` (landing)** — dropdown de menu mobile. **Excluída** — não é um modal de produto.

3. **`(onboarding)/layout.tsx` e `(auth)/layout.tsx`** — layouts de página simples. **Excluídos.**

4. **`toast.tsx`** — sistema de notificações não-bloqueantes (fixed bottom-right, auto-dismiss 4s). **Excluído.**

5. **`acessos-client.tsx`** — usa `window.confirm()` (browser nativo) para ações destrutivas (revogar membro, revogar convite) e expansão inline de formulário. **Nenhum uso de `<Modal>`.** É um candidato a migração futura para modais de confirmação.

6. **`livia-bubble.tsx`** — widget de chat com overlay próprio (não usa `<Modal>`). Hardcoded com cores escuras fixas (`#0B0B0D`, `#1F1F27`, `#C8102E`) — não usa CSS variables do tema, compatível apenas com tema escuro.

7. **`profissionais-client.tsx` — ProfessionalModal:130** usa `<textarea className="livo-input">` em vez de `<Textarea>` (pendência de migração do componente `Textarea`).

8. **Linha dupla de convite:** `InviteModal` em `profissionais-client.tsx` e o formulário inline em `acessos-client.tsx` compartilham a mesma `createInvitationAction` mas têm UX diferente — o primeiro é modal, o segundo é inline.
