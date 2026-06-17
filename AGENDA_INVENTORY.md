# AGENDA_INVENTORY.md

Inventário completo da implementação atual da Agenda do LIVO, levantado antes de qualquer redesign. Documento somente de leitura — nenhum arquivo de código foi alterado, nenhum componente foi criado, nenhuma migration foi rodada.

---

## 1. Estrutura atual

### 1.1 Duas visões paralelas e independentes

Hoje a Agenda tem **dois sistemas completamente separados**, sem nenhum código compartilhado entre eles, alternados via querystring `?view=`:

| Visão | Rota | Componente raiz | Natureza |
|---|---|---|---|
| **Mensal** (padrão) | `/dashboard/agenda` | `MonthlyCalendar` (`src/components/monthly-calendar.tsx`) | Somente leitura/visualização |
| **Operacional** | `/dashboard/agenda?view=operacional` | `AgendaBoard` (`src/app/(dashboard)/dashboard/agenda/agenda-board.tsx`) | Totalmente interativa (criar/editar/mover/mudar status/abrir comanda) |

O toggle entre as duas é renderizado em `agenda/page.tsx` (`ViewToggle`), só com 2 opções: "Mensal" e "Operacional" — não existe um terceiro estado "Semanal" nesse nível.

### 1.2 `MonthlyCalendar` — sub-estrutura interna (mês/semana/dia)

Confusamente, `MonthlyCalendar` tem **seu próprio toggle interno** de "Mês / Semana / Dia" (`ViewToggle` local, com state `view: "month" | "week" | "day"`), que renderiza:

- `view === "month"` → grid de mês construído inline dentro do próprio `monthly-calendar.tsx` (não delega a um componente separado), com `DayPanel` (drawer lateral) abrindo ao clicar num dia.
- `view === "week"` → delega para `WeeklyCalendar` (`src/components/weekly-calendar.tsx`, 359 linhas)
- `view === "day"` → delega para `DayCalendar` (`src/components/day-calendar.tsx`, 345 linhas)

Ou seja: **existem sim `WeeklyCalendar` e `DayCalendar` como componentes separados**, mas pertencem à árvore de `MonthlyCalendar` (visão somente-leitura), não à `AgendaBoard` (visão operacional). `AgendaBoard` é exclusivamente uma visão de **um único dia** (colunas por profissional), sem alternância mês/semana embutida.

Tipo de dados usado por toda a árvore `MonthlyCalendar`/`WeeklyCalendar`/`DayCalendar`/`DayPanel`: `AppointmentForCalendar` (definido em `day-panel.tsx`) — um tipo **achatado e somente leitura**, bem mais simples que `AgendaAppointment`:
```ts
type AppointmentForCalendar = {
  id: string;
  startTime: Date | string;
  endTime: Date | string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  clientName: string | null;
  clientPhone: string | null;
  professionalName: string;
  serviceName: string;
  priceInCents: number;
};
```
Não tem `professionalId`, `serviceId`, `comandaId`, `clientId` — só nomes para exibição. Não há nenhuma ação de escrita nessa árvore (sem criar/editar/mover/mudar status).

### 1.3 Componente órfão encontrado

`src/app/(dashboard)/dashboard/agenda/date-navigator.tsx` (`DateNavigator`) **não é importado em lugar nenhum do projeto** (confirmado via grep — só aparece no próprio arquivo). É código morto. `AgendaBoard` tem sua própria navegação de data inline (funções `navigate()`/`goToday()` no próprio componente), duplicando a funcionalidade que `DateNavigator` deveria prover.

### 1.4 Componentes internos de `agenda-board.tsx` (1722 linhas)

Todos definidos no mesmo arquivo, nenhum exportado/reutilizável fora dele:

| Componente | Linha aprox. | Responsabilidade |
|---|---|---|
| `AgendaBoard` (default export) | 177–530 | Componente raiz: state da grade do dia, navegação, toasts, orquestra os 4 modais via `ModalState` (union discriminada) |
| `TimeColumn` | 534–572 | Coluna fixa à esquerda com os horários (régua de tempo) |
| `ProfessionalColumn` | 585–764 | Uma coluna por profissional; calcula `slotMap` (qual slot pertence a qual appointment) e renderiza os cards |
| `AppointmentModal` | 766–1000 | Modal de detalhe ao clicar num appointment — mostra info, e condicionalmente os botões de ação (RBAC, ver seção 2.6) |
| `MoveModal` | 1012–1102 | Modal para mover appointment para outro profissional (só owner/reception) |
| `EditAppointmentModal` | 1102–1299 | Modal de edição (serviço, data/hora, cliente, notas) |
| `NewAppointmentModal` | 1299–~1722 | Modal de criação rápida — contém toda a lógica de autocomplete de cliente (ver 2.4) |

`InfoRow` é um pequeno helper interno usado por `AppointmentModal`.

---

## 2. Lógica de negócio crítica

Toda a lógica de escrita de `Appointment` está centralizada em **`src/lib/appointment-core.ts`** — comentário no topo do arquivo é explícito: *"Única fonte de verdade para criação, edição e atualização de status de Appointments. Todos os writers (book, AgendaBoard) devem usar estas funções. Nenhum outro arquivo deve conter lógica de criação direta de Appointment."* Isso é crítico para o redesign: qualquer novo writer (multi-serviço, drag-and-drop) **deve** passar por aqui, não reimplementar.

### 2.1 Detecção de conflito (`checkConflict`, privada em `appointment-core.ts`)

```ts
async function checkConflict(professionalId, startDate, endDate, excludeId?) {
  const where = {
    professionalId,
    status: { notIn: ["cancelled", "no_show"] },
    date: { lt: endDate },
    endTime: { gt: startDate },
    ...(excludeId ? { NOT: { id: excludeId } } : {}),
  };
  return (await db.appointment.findFirst({ where, select: { id: true } })) !== null;
}
```

Regra exata: dois agendamentos conflitam se `A.date < B.endTime AND A.endTime > B.date` (overlap clássico de intervalos half-open). `cancelled` e `no_show` **não bloqueiam** slots. `excludeId` existe para permitir reagendar o próprio appointment sem conflitar consigo mesmo.

`conflict-detection.test.ts` documenta os critérios de quebra explicitamente no cabeçalho:
- Trocar `date: { lt: endDate }` por `lte` → bloquearia incorretamente agendamento adjacente (ex: termina exatamente quando outro começa)
- Trocar `endTime: { gt: startDate }` por `gte` → mesmo problema do lado inverso
- Remover `status: { notIn: [...] }` → cancelados passariam a bloquear horário
- Remover `NOT: { id: excludeId }` → editar um appointment entraria em conflito com ele mesmo

`checkConflict` é chamada em 3 lugares: `createAppointmentCore`, `updateAppointmentCore`, `moveAppointmentCore`.

### 2.2 Advisory lock (`pg_advisory_xact_lock`)

Só existe em **`createAppointmentCore`** (não em update/move). Fluxo:
1. Faz um `checkConflict` **fora** da transação primeiro (early-exit otimista, evita abrir transação se já sabe que vai falhar).
2. Dentro de `db.$transaction(async (tx) => {...})`:
   ```ts
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.professionalId}))`;
   ```
   Serializa criações concorrentes **por profissional** (hash do `professionalId` como chave do lock). O lock é automaticamente liberado no commit/rollback da transação (`xact_lock`, não `lock` genérico).
3. Repete o conflict-check **dentro** da transação, já com o lock adquirido — essa é a checagem autoritativa. Se houver conflito, lança `Object.assign(new Error("conflict"), { isConflict: true })`, capturado no `catch` externo e convertido em `{ success: false, error: "Horário em conflito..." }`.
4. Só então cria/reusa o `Client` e cria o `Appointment`.

Isso resolve a race condition clássica de dois usuários criando agendamento pro mesmo horário/profissional simultaneamente — sem o lock, ambos passariam pelo check otimista e os dois criariam o registro.

**Risco para o redesign:** qualquer funcionalidade de drag-and-drop que mova/redimensione appointments concorrentemente precisa decidir se também usa esse lock (hoje `moveAppointmentCore` e `updateAppointmentCore` **não usam** advisory lock — só fazem o `checkConflict` simples, sem transação+lock). Isso é uma lacuna pré-existente, não introduzida pelo redesign, mas vale registrar: mover/editar tem uma race window que criar não tem.

### 2.3 Integração com Comanda (`abrirComanda` com `serviceId`)

Em `AgendaBoard.handleAbrirComanda()`:
```ts
await abrirComanda({
  professionalId: appointment.professionalId,
  clientId: appointment.clientId ?? undefined,
  clientName: appointment.clientName,
  notes: appointment.notes ?? undefined,
  appointmentId: appointment.id,
  serviceId: appointment.serviceId,
});
```
Isso é o trabalho da tarefa anterior (já implementado e testado): `abrirComanda` em `comandas/actions.ts` recebe `serviceId` opcional; se presente e o `Service` ainda existir/estiver ativo, cria a `Comanda` **e** o primeiro `ComandaItem` (do serviço agendado) na mesma `$transaction`. Botão "Abrir Comanda" só aparece no `AppointmentModal` quando `!appointment.comandaId` e status é `pending`/`confirmed`.

**Implicação direta para multi-serviço:** hoje `appointment.serviceId` é singular — se o agendamento passar a ter múltiplos serviços, essa chamada precisa mudar para passar uma lista de serviços (ou nenhum `serviceId` direto, delegando ao usuário adicionar manualmente cada item depois de abrir a comanda vazia — regressão de UX que o redesign precisa decidir como evitar).

### 2.4 Autocomplete de cliente (`NewAppointmentModal`)

Implementado inteiramente dentro do próprio `agenda-board.tsx`, sem componente compartilhado:
- `debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)` — debounce manual de **300ms**.
- Dispara a busca só com `term.trim().length >= 2`.
- Chama a server action `searchClientsForAgenda(term)` (em `agenda-actions.ts`), que por sua vez aplica `clientScope(membership)` (RBAC — ver 2.6) e busca por `name` (`contains`, `insensitive`) OU `phone` (`contains`), `take: 8`, ordenado por nome.
- Estados: `selectedClient | null`, `searchResults`, `isSearching`, `showDropdown`, e um modo alternativo `isManualMode` (digitar nome+telefone livre quando o cliente não existe no cadastro) — `manualName`/`manualPhone`.
- `finalClientName`/`finalClientPhone` resolvem para o cliente selecionado OU os campos manuais, o que estiver ativo.

Esse padrão de busca/debounce/modo-manual está **duplicado** em outros lugares do projeto (ex.: `nova-comanda-form.tsx`, levantado em tarefas anteriores) — candidato a extração de hook/componente compartilhado no redesign, mas não existe hoje.

### 2.5 Cálculo de `endTime`

Sempre derivado de `Service.durationMin` (campo `Int`, `@default(30)`, em minutos), nunca armazenado manualmente pelo usuário:
```ts
const endDate = new Date(startDate.getTime() + service.durationMin * 60_000);
```
Calculado em `createAppointmentCore` e `updateAppointmentCore`. `Appointment.endTime` é persistido (`DateTime?`, nullable no schema, mas sempre preenchido pelos dois fluxos de escrita atuais). Na UI, `getSlotCount(durationMin)` em `agenda-board.tsx` converte minutos em número de slots visuais (`Math.ceil(durationMin / SLOT_MINUTES)`, mínimo 1).

### 2.6 RBAC na Agenda

Função central: `appointmentScope(membership)` em `src/lib/permissions.ts`:
```ts
export function appointmentScope(m: MembershipContext): Prisma.AppointmentWhereInput {
  if (canSeeAllClients(m)) return { barbershopId: m.barbershopId };
  return { barbershopId: m.barbershopId, professionalId: m.professionalId ?? "__none__" };
}
// canSeeAllClients(m) = m.role === "owner" || m.role === "reception"
```
Mesmo padrão em `clientScope` (usado no autocomplete).

Efeitos práticos:
- **Owner / Reception**: veem todos os profissionais e todos os agendamentos da barbearia (`getAgendaDay` não filtra por profissional). Podem mover (`MoveModal` só aparece pra eles), criar para qualquer profissional, editar qualquer agendamento, mudar status de qualquer um.
- **Barber**: `visibleProfessionals` em `AgendaBoard` é filtrado client-side para mostrar só a própria coluna (`data.professionals.filter(p => p.id === data.userProfessionalId)`); mesmo que o filtro client-side falhasse, o server-side já restringe via `appointmentScope` na própria query de `getAgendaDay`. `canManage` no `AppointmentModal` é `true` só se `userRole !== "barber"` OU o appointment é dele mesmo. Barber não vê botão "Mover" (`userRole === "owner" || userRole === "reception"` no JSX). Em `onSlotClick` (criar novo), há uma segunda checagem redundante: se `data.userRole === "barber" && prof.id !== data.userProfessionalId`, ignora o clique.
- Server actions (`moveAppointment`, `createQuickAppointment`) fazem suas próprias checagens via `requireRole(["owner", "reception"])` (move) ou comparação manual de `professionalId` (criar) — **defesa em profundidade**, não dependem só do filtro client-side.

---

## 3. Schema e tipos atuais

### 3.1 `Appointment` (prisma/schema.prisma:170-195)

```prisma
model Appointment {
  id             String            @id @default(cuid())
  date           DateTime
  endTime        DateTime?
  status         AppointmentStatus @default(pending)
  notes          String?
  clientName     String
  clientPhone    String?
  clientEmail    String?
  barbershopId   String
  professionalId String
  serviceId      String            // ← singular, obrigatório, 1:1 com Service
  clientId       String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  barbershop     Barbershop        @relation(...)
  client         Client?           @relation(...)
  professional   Professional      @relation(...)
  service        Service           @relation(...)
  comanda        Comanda?

  @@index([barbershopId])
  @@index([barbershopId, date])
  @@index([professionalId, date, endTime])
}
```

**Confirmado: `serviceId` é singular hoje — um agendamento tem exatamente um serviço.** Não existe nenhum modelo `AppointmentService` (grep no schema retornou zero ocorrências) — para suportar múltiplos serviços por agendamento, esse modelo de junção **precisa ser criado do zero**, não é uma reintrodução de algo removido (ao menos não está documentado/visível no schema atual).

O índice `@@index([professionalId, date, endTime])` já existe e é exatamente o que `checkConflict` precisa — qualquer redesign de conflict-detection multi-serviço deve preservar (ou substituir por um equivalente) esse índice composto.

### 3.2 `Service` (prisma/schema.prisma:125-141)

```prisma
model Service {
  id           String        @id @default(cuid())
  name         String
  description  String?
  durationMin  Int           @default(30)   // ← nome exato, em minutos
  priceInCents Int           @default(0)
  isActive     Boolean       @default(true)
  barbershopId String
  ...
  appointments Appointment[]
  comandaItems ComandaItem[]
}
```
Campo de duração é **`durationMin`** (não `durationMinutes`), `Int`, default 30. Usado em todo lugar (`agenda-board.tsx`, `appointment-core.ts`) sob esse nome exato.

### 3.3 `AgendaAppointment` (tipo client-side, `agenda-actions.ts:26-41`)

```ts
export type AgendaAppointment = {
  id: string;
  date: string;            // ISO string
  endTime: string | null;  // ISO string
  status: AppointmentStatus;
  clientId: string | null;
  comandaId: string | null;
  clientName: string;
  clientPhone: string | null;
  notes: string | null;
  professionalId: string;
  serviceId: string;            // singular
  serviceName: string;
  serviceDurationMin: number;
  servicePriceInCents: number;
};
```
Esse é o tipo "rico" usado por toda a `AgendaBoard` — bem diferente do `AppointmentForCalendar` (usado pela árvore `MonthlyCalendar`). Um redesign multi-serviço precisaria virar `serviceId`/`serviceName`/`serviceDurationMin`/`servicePriceInCents` em algo como `services: { id, name, durationMin, priceInCents }[]`, propagando a mudança por `agenda-actions.ts`, `agenda-board.tsx` (todos os 7 componentes internos leem esses campos) e `appointment-core.ts`.

### 3.4 `agenda-actions.ts` completo — 5 server actions + 2 tipos auxiliares

| Função | Linha | O que faz |
|---|---|---|
| `getAgendaDay(dateStr)` | 59 | Busca profissionais ativos + appointments do dia (não-cancelados) com `appointmentScope`, monta `AgendaDayData` |
| `getServicesForAgenda()` | 130 | Lista serviços ativos da barbearia |
| `moveAppointment(id, newProfId)` | 151 | `requireRole(["owner","reception"])` → `moveAppointmentCore` |
| `updateAppointment(id, data)` | 172 | `requireMembership()` → `updateAppointmentCore` |
| `createQuickAppointment(data)` | 206 | Checagem manual de RBAC pra barber → `createAppointmentCore` |
| `searchClientsForAgenda(search)` | 252 | Autocomplete (ver 2.4) |

Todas revalidam `/dashboard` e `/dashboard/agenda` após mutação (exceto a busca, que é só leitura).

---

## 4. Drag-and-drop

**Não existe nenhuma implementação de drag-and-drop hoje — nem parcial, nem desabilitada.**

- `grep -rn "draggable|onDragStart|onDragOver|onDrop|useDrag|useDrop|dnd-kit|react-dnd" src/app/(dashboard)/dashboard/agenda/` → **zero resultados**.
- `grep -i "dnd|drag" package.json` → **zero resultados** — nenhuma lib de DnD instalada (`@dnd-kit/*`, `react-dnd`, etc. ausentes).

Mover um appointment para outro profissional hoje é feito exclusivamente via `MoveModal` (seleção em dropdown), não por arrastar-e-soltar. Se o redesign quiser DnD, é greenfield total: escolher lib, instalar, integrar com `moveAppointmentCore` (que já existe e já faz conflict-check — a lib de DnD só precisaria chamar essa action no `onDrop`).

---

## 5. Componentes de UI reaproveitáveis (já existentes)

Confirmados via `Glob`/leitura — todos prontos para uso:

| Componente | Arquivo | Onde se encaixaria no redesign |
|---|---|---|
| `Modal` | `src/components/ui/modal.tsx` | Já é a base de `AppointmentModal`, `MoveModal`, `EditAppointmentModal`, `NewAppointmentModal` — continua válido para qualquer detalhe/edição em modal |
| `Drawer` | `src/components/ui/drawer.tsx` | Já usado por `DayPanel` (visão mensal) — bom candidato para um painel lateral de detalhe na visão operacional também, se o redesign preferir drawer a modal para um clique rápido |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Já usado em `AgendaBoard` quando não há profissionais ativos — reaproveitável para "nenhum agendamento no dia/semana" |
| `LoadingState` | `src/components/ui/loading-state.tsx` | Já usado em `AgendaBoard` durante `loadingNav` — reaproveitável em qualquer fetch assíncrono do redesign |
| `ErrorState` | `src/components/ui/error-state.tsx` | Existe mas **não é usado em nenhum lugar da agenda hoje** — não há tratamento de erro de carregamento na agenda (só toasts de erro pós-ação). Gap a considerar no redesign. |
| `Select` | `src/components/ui/select.tsx` | Usado em `MoveModal`, `EditAppointmentModal`, `NewAppointmentModal` para escolher profissional/serviço — `<select>` nativo estilizado, sem busca/autocomplete embutida |
| `Input` | `src/components/ui/input.tsx` | Usado nos formulários de cliente manual e busca |
| `Textarea` | `src/components/ui/textarea.tsx` | Usado no campo de notas |

---

## 6. Gaps — o que precisa ser CRIADO vs. REAPROVEITADO

### Precisa ser CRIADO
- **Modelo `AppointmentService`** (tabela de junção) no schema, se o redesign exigir múltiplos serviços por agendamento — não existe hoje, não é uma reintrodução.
- **Migração de dados**: todo `Appointment.serviceId` existente precisaria virar 1 linha em `AppointmentService` (backfill), análogo ao que foi feito na migração de comissão `Membership → Professional`.
- **Lib de drag-and-drop** (escolha + instalação) — zero infraestrutura hoje.
- **Adaptação de `appointment-core.ts`** para múltiplos serviços: `createAppointmentCore`/`updateAppointmentCore` calculam `endTime` a partir de **um** `Service.durationMin` — passa a precisar somar a duração de todos os serviços do agendamento.
- **Adaptação de `AgendaAppointment`/`AgendaService`** e de todo `agenda-board.tsx` (todos os componentes leem `serviceId`/`serviceName`/`serviceDurationMin`/`servicePriceInCents` singulares).
- **Adaptação de `abrirComanda`** (chamada em `handleAbrirComanda`) para passar múltiplos serviços em vez de um `serviceId` único.
- **Unificação ou ponte entre os dois sistemas de visão** (`MonthlyCalendar`/`WeeklyCalendar`/`DayCalendar` somente-leitura vs. `AgendaBoard` operacional) — hoje são códigos e tipos de dados totalmente independentes; se o redesign unificar as visões, é refatoração grande, não foi escopo desta leitura decidir a abordagem.
- **Uso de `ErrorState`** na agenda (gap de UX hoje, não de schema).

### Pode ser REAPROVEITADO
- `Modal`, `Drawer`, `EmptyState`, `LoadingState`, `Select`, `Input`, `Textarea` — todos genéricos, sem acoplamento a serviço singular.
- `checkConflict` — a regra de overlap (`date < endTime AND endTime > date`) é válida independente de quantos serviços um agendamento tem, desde que `startDate`/`endDate` continuem sendo calculados corretamente a partir da soma das durações.
- Advisory lock (`pg_advisory_xact_lock(hashtext(professionalId))`) — independe de quantos serviços, só depende do profissional.
- `appointmentScope`/`clientScope` (RBAC) — não dependem de serviço.
- `moveAppointmentCore` — a lógica de mover (reconflitar no novo profissional) não muda com multi-serviço, só precisa que `appointment.endTime` já reflita a duração total.
- Debounce de autocomplete de cliente (padrão, mesmo que hoje esteja duplicado/inline) — lógica reaproveitável como está, ou extraível para hook compartilhado.
- `SLOT_CONFIG`/`TOTAL_SLOTS` (`src/lib/slot-config.ts`) — config central de granularidade dos slots, já é "fonte única" e comentada como tal; não precisa mudar para multi-serviço.

---

## 7. Riscos identificados

1. **Timezone (`America/Sao_Paulo` hardcoded, sufixo `-03:00` manual)**: `agenda-board.tsx` usa `toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })` em vários pontos (`getSlotIndex`, `formatTime`) e constrói ISO strings com sufixo fixo `-03:00` em `slotToDateISO`. O comentário no código já avisa: *"Brasília (sem DST desde 2019), independente do timezone do browser"* — funciona hoje porque o Brasil não tem mais horário de verão, mas é uma premissa frágil e espalhada por múltiplas funções, não centralizada. Qualquer redesign que toque nessas funções de data precisa preservar esse comportamento ou centralizá-lo (risco de regressão de horário se reescrito sem atenção).
2. **Advisory lock só em criação, não em update/move**: já documentado em 2.2 — risco pré-existente, não introduzido pelo redesign, mas fácil de esquecer se o redesign adicionar nova lógica de "mover via drag-and-drop" sem notar que `moveAppointmentCore` não tem lock.
3. **Testes existentes acoplados ao schema atual**: `tests/integration/agenda/conflict-detection.test.ts` mocka `db.service.findFirst` retornando um único `durationMin` e monta `where` esperando `serviceId` singular implícito via `professionalId`+datas. Migrar para multi-serviço exige reescrever esses testes (não só ajustar — a forma de calcular `endDate` muda de "1 serviço" para "soma de N serviços"). Mesma observação vale para qualquer teste de `appointment-core.ts`, `agenda-actions.ts`, `comanda-abertura.test.ts` (que já testa `serviceId` opcional em `abrirComanda`).
4. **Dois sistemas de tipos paralelos (`AgendaAppointment` vs `AppointmentForCalendar`)**: se o redesign decidir unificar as visões mensal/semanal/diária com a visão operacional, vai precisar reconciliar esses dois tipos — hoje são deliberadamente diferentes (um é rico/editável, outro é plano/somente-leitura). Mudar um sem considerar o outro pode quebrar a visão mensal silenciosamente (ela não é coberta pelos mesmos testes que cobrem `AgendaBoard`).
5. **`DateNavigator` órfão**: não é um risco de quebra, mas é uma fonte de confusão — se alguém durante o redesign decidir "reaproveitar" esse componente assumindo que já está em uso, vai descobrir que não está conectado a nada.
6. **`revalidatePath` duplicado (`/dashboard` e `/dashboard/agenda`)** em toda mutação de `agenda-actions.ts` — não é exatamente um risco, mas é um padrão a preservar conscientemente: a Agenda alimenta dados que aparecem também na home do dashboard (`/dashboard`), então qualquer nova mutação introduzida pelo redesign precisa lembrar de revalidar os dois caminhos, não só `/dashboard/agenda`.
7. **`clientId` imutável após o primeiro vínculo** (`updateAppointmentCore`, comentário explícito no código: *"clientId is immutable once set — never reassign... corromperia o histórico de CRM"*) — regra de negócio sutil que um redesign de edição de agendamento precisa preservar exatamente, não é óbvia ao só olhar a UI.

---

## Resumo executivo

A Agenda hoje é **duas aplicações distintas coexistindo sob a mesma rota**: uma visão de calendário tradicional (mês/semana/dia, somente leitura, com seus próprios componentes `MonthlyCalendar`/`WeeklyCalendar`/`DayCalendar`/`DayPanel`) e uma visão operacional de colunas-por-profissional (`AgendaBoard`, totalmente interativa, 1722 linhas em um único arquivo com 7 componentes internos). A lógica de negócio que realmente importa preservar — conflict detection, advisory lock, RBAC, cálculo de `endTime`, integração com Comanda — está bem isolada em `src/lib/appointment-core.ts` e `src/lib/permissions.ts`, fora da camada de UI, o que é uma boa notícia para o redesign: a UI pode ser reescrita com relativamente baixo risco de quebrar essas regras, **desde que o redesign continue chamando essas funções centrais em vez de reimplementá-las**. O maior gap estrutural para suportar múltiplos serviços por agendamento é a ausência completa de um modelo `AppointmentService` — isso é trabalho de schema + migração + backfill antes de qualquer mudança de UI, análogo ao que já foi feito recentemente para mover campos de comissão de `Membership` para `Professional`. Não existe nenhuma infraestrutura de drag-and-drop hoje (zero lib instalada, zero código) — é greenfield total se o redesign quiser essa funcionalidade.
