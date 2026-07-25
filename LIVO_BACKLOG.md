# LIVO — BACKLOG DE ENGENHARIA E PRODUTO

Documento consolidado em 11/07/2026, atualizado em 12/07/2026 (fechamento da Fase 2),
em 15/07/2026 (fechamento da Fase 4.5) e novamente em 16/07/2026 após o fechamento da
reforma visual completa do fluxo público de agendamento (Fase 4.6). Itens concluídos
foram reduzidos a resumos curtos — histórico completo de diagnóstico continua disponível
nas conversas originais, se precisar recuperar detalhe fino de algum. Itens pendentes
mantêm detalhe técnico completo, pois são acionáveis.

**Nota de governança [15/07] — CORREÇÃO IMPORTANTE sobre razão social:** a empresa não é
"SALA Tecnologia Ltda." — é um **MEI (Microempreendedor Individual)**, CNPJ
67.696.612/0001-XX, registrado sob o nome empresarial **"67.696.612 LETICIA DEGANI
FERNANDES MORAES"** (nome da esposa do founder). "SALA Tecnologia" e "LIVO Barber" são
nomes de marca/produto, não a razão social oficial.

**Nota estratégica [16/07]:** founder sinalizou intenção de iniciar um novo produto —
**LIVO Beauty/Saúde unificado** — combinando salões de beleza, estética e profissionais
de saúde (nutricionistas, psicólogas, fisioterapeutas) num único sistema. Isso é uma
mudança de sequência em relação ao roadmap original do `LIVO_OPERATING_SYSTEM.md`, que
tratava Beauty (Fase 2) e Med (Fase 3) como fases separadas. Avaliação preliminar：
Beauty é majoritariamente reskin (mesmo formato de negócio: profissional + serviço +
agendamento); profissionais de saúde exigem desenho de dados novo (prontuário, dado
sensível de saúde sob LGPD, sessões recorrentes, ausência do conceito de "equipe/loja").
Recomendado tratar como dois esforços sequenciais, não um único pacote. Discussão a
aprofundar em sessão dedicada.

---

## 1. BUGS

### LIVO-001 — Nenhum bug ativo adicional reportado além dos listados abaixo.

*(itens anteriores a 16/07 preservados como resumo — ver histórico de conversas para
detalhe completo de LIVO-034, 040, 041, 054, 059, todos ✅ concluídos)*

### LIVO-068 🆕 🔴 [16/07] Bloqueio de trial vencido não era aplicado após navegação por clique — CRÍTICO, corrigido

**Causa raiz:** Client Router Cache do Next.js App Router mantinha o layout do dashboard
em cache no navegador após o primeiro carregamento — `checkBillingAccess()` (que rodava
em `layout.tsx`) não era reexecutado ao navegar por clique dentro do dashboard, só um
hard refresh forçava a checagem. Resultado: usuário com trial vencido conseguia usar o
sistema inteiro normalmente após o primeiro carregamento da sessão.

**Tentativa 1 (insuficiente):** `experimental.staleTimes.dynamic = 0` em
`next.config.ts` — não resolveu sozinho.

**Correção definitiva:** gate de billing movido de `layout.tsx` para um novo
`template.tsx` — mecanismo do Next.js que remonta do zero a cada navegação (ao contrário
do layout, preservado entre rotas irmãs). `BILLING_EXEMPT` ampliado para incluir também
`/dashboard/faturamento` (Plano LIVO) e `/dashboard/settings` (Configurações) — usuário
bloqueado ainda precisa conseguir ver/pagar a fatura e ajustar a conta.

**Pendência de decisão de negócio, não implementada ainda:** carência de 3 dias após
vencimento de **assinatura paga** (`planStatus: suspended/cancelled`) — regra diferente
de trial vencido (que deve continuar bloqueando imediatamente, sem carência). Hoje o
sistema bloqueia ambos os casos imediatamente; a carência de 3 dias para assinatura paga
ainda precisa ser desenhada e implementada.

### LIVO-069 🆕 [16/07] Integração GitHub↔Vercel com falhas recorrentes de webhook

Durante a sessão de 16/07, múltiplos pushes para `main` e para branches de feature não
dispararam deployments automáticos na Vercel (nem Preview, nem Production), mesmo com o
commit confirmado no GitHub. Causa provável: instabilidade correlacionada a um incidente
de SSO reportado no status oficial da Vercel no mesmo dia (não confirmado como causa
direta). Contornado via **Vercel CLI**, agora configurado localmente
(`vercel login` → `vercel link` → `vercel` / `vercel --prod`), que gera deploy direto do
disco, ignorando o webhook. Se o problema for recorrente, considerar diagnóstico mais
profundo (verificar Deploy Hooks, permissões do GitHub App) ou abrir chamado com suporte
Vercel. Sem prioridade definida — mitigado, não bloqueia mais o fluxo de trabalho.

---

## 4. UX/UI

*(itens anteriores preservados como resumo — ver histórico para LIVO-009, 042, 043, 050,
051, 057, 058, todos ✅ concluídos)*

### LIVO-061 ✅ [16/07] Fundação visual do agendamento público

Fonte Inter Tight isolada (`src/lib/fonts.ts`, mesmo padrão de escopo do Poppins). Paleta
oficial LIVO 2026 documentada em `src/styles/public-booking-tokens.css` (prefixo `--pb-`,
não colide com tokens do dashboard nem institucional). Novo `layout.tsx` em
`src/app/[slug]/` aplicando fonte + tokens a toda a árvore `[slug]/**`. Hero Section
reconstruída: navbar compacta (logo + hambúrguer), foto de capa 280px sem overlay,
título/descrição/CTAs/selos de confiança em fundo sólido, rodapé de endereço/telefone.
Documentado em ADR-005 (paleta é identidade fixa da marca LIVO, não customizável por
tenant — schema não tem campo de cor).

### LIVO-062 ✅ [16/07] Especialidades e ano de atuação do profissional

`Professional.yearStarted` (Int?) e `Professional.specialties` (String[], aditivos).
Campos novos no form de criar/editar profissional do painel (`/dashboard/profissionais`),
mesmo padrão visual do campo Bio já existente. Validação manual (ano entre 1950 e ano
atual, especialidades limitadas a 8 itens de até 40 caracteres).

### LIVO-063 ✅ [16/07] Sistema de avaliações de clientes

Model `Review` (rating 1-5, comment opcional, `appointmentId` único — 1 review por
agendamento) e `ReviewInvite` (token único, mesmo padrão de `PasswordResetToken`/
`EmailVerificationToken`: `tokenHash`, `expiresAt`, `usedAt`). Cache de agregação
(`avgRating`, `reviewCount`) em `Professional`, recalculado incrementalmente a cada novo
review (sem `AVG()`/`COUNT()` sobre toda a tabela). Convite gerado automaticamente ao
fechar comanda (`fecharComanda`, fail-open, fora da transação financeira); e-mail via
Resend disparado se o cliente tiver e-mail cadastrado (WhatsApp fica para quando LIVO-012
existir). Página pública `/avaliar/[token]` com formulário de estrelas + comentário.

### LIVO-064 ✅ [16/07] Etapa de Serviço movida para dentro do stepper de agendamento

Antes, o serviço era escolhido fora do fluxo de agendamento (`service-picker.tsx` na
landing, via query string). Agora é a primeira etapa do `BookingForm`
(`src/app/[slug]/book/booking-form.tsx`), com estado local `selectedServiceIds`.
`book/page.tsx` não exige mais `serviceIds` na URL — busca todos os serviços ativos e
deixa o cliente escolher dentro do próprio stepper. `service-picker.tsx` deletado
(sem mais usos). CTAs da Página Inicial ("Agendar agora"/"Ver serviços") levam direto
para `/[slug]/book`.

### LIVO-065 ✅ [16/07] Restilo do card de Profissional + lógica de "poucas vagas"

Card de profissional reformulado (layout horizontal): exibe `specialties`, `yearStarted`
("Desde AAAA") e rating condicional (estrela + nota só aparece se `reviewCount > 0` —
nunca dado fabricado). Lógica de "poucas vagas" no Horário: quando menos de 25% dos
slots do dia estão disponíveis, os slots restantes ganham estilo de aviso (`--pb-warning`)
+ legenda explicativa — calculado 100% no client a partir do array `slots` já existente,
sem mudança de backend.

### LIVO-066 ✅ [16/07] Etapa de Confirmação + resumo fixo lateral

Etapa "Seus dados" renomeada para "Confirmação" no stepper (bate com a imagem de
referência); resumo reorganizado em linhas com ícone (Serviço, Profissional, Data,
Horário, Duração, Total). Resumo fixo lateral (sticky, 360px, oculto em telas pequenas)
implementado via refatoração de múltiplos `return` antecipados por etapa para uma cadeia
`if/else if/else` atribuindo a variável `stepContent`, permitindo envolver o conteúdo com
layout de duas colunas. Sidebar atualiza automaticamente conforme o estado avança entre
etapas.

### LIVO-067 ✅ [16/07] Tela de Sucesso reestilizada

Confete decorativo sutil, resumo em chips horizontais com ícone (Serviço, Profissional,
Data, Horário, Valor). Três botões de ação: "Adicionar ao Google Agenda" (link gerado a
partir de data+hora+duração), "Abrir localização" (Google Maps, só aparece se houver
endereço), "Falar no WhatsApp" (via `sanitizePhone`/`buildWhatsappUrl` já existentes em
`lib/whatsapp.ts`, sem mensagem pré-pronta — decisão do founder). Card "Não esqueça" com
foto real de cadeira de barbeiro (`public/booking-success-chair.jpg`, licença Pexels),
filtro `grayscale(60%) brightness(0.35) contrast(1.1)` para integrar à paleta escura.
Botão "Ver minhas reservas" omitido de propósito — não existe área de cliente/login no
sistema hoje.

---

## PENDÊNCIAS CONHECIDAS DA REFORMA VISUAL (não bloqueantes, documentadas)

Comparação rigorosa contra a imagem de referência, feita ao final da sessão de 16/07,
identificou as seguintes diferenças ainda não corrigidas — founder optou por não
corrigir agora ("por hora está pronto, deixe assim"), mantidas aqui para retomada futura:

1. **Logo/navbar não repete dentro de `/book`** — cada etapa do stepper na imagem de
   referência repete o cabeçalho completo (ícone da marca + wordmark); hoje só aparece
   "← Voltar" + texto pequeno.
2. **Stepper com 4 pontos, não 5** — a imagem inclui "Sucesso" como quinto ponto visual
   do indicador de etapas (mesmo não sendo clicável); implementação atual só mostra as
   4 etapas anteriores.
3. **Títulos/subtítulos genéricos por etapa** — a imagem tem título contextual próprio
   por etapa ("Escolha o serviço", "Escolha o profissional" etc.); hoje é sempre
   "Agendar serviço" fixo.
4. **Etapa de Horário incompleta** — falta: 3 botões de atalho ("Mais procurado", "Menor
   espera", "Recomendado"), agrupamento de horários por período (MANHÃ/TARDE/NOITE), e
   frase explicando a recomendação por IA. Diferença mais significativa das listadas —
   é funcionalidade faltando, não só estilo.
5. **Cor do ícone de sucesso** — implementado em verde (`--pb-success`, convenção
   semântica padrão); imagem de referência usa tom vermelho/bordô (identidade da marca).
6. **Densidade do confete** — imagem tem bem mais partículas espalhadas; implementação
   atual tem só 4 pontos discretos.
7. **Rodapé de selos de confiança** ("Ambiente premium", "Profissionais especialistas"
   etc.) — aparece na imagem, não implementado em nenhuma tela ainda. Escopo (por tela
   ou só no conjunto geral) não esclarecido.

---

# ROADMAP DE EXECUÇÃO

## Fase 0 — Fundação de Governança e Segurança — ✅ concluída
## Fase 1 — Visibilidade e Dados — ✅ concluída
## Fase 2 — Fechamento do Grupo D + Onboarding — ✅ concluída [12/07]
## Fase 4.5 — Bloco Asaas + Indicação — ✅ concluída [15/07]
## Fase 4.6 — Reforma Visual do Agendamento Público — ✅ concluída [16/07]

LIVO-061 a LIVO-067 (fundação visual, especialidades/avaliações, stepper completo com
Serviço/Profissional/Horário/Confirmação/Sucesso). Pendências conhecidas documentadas
acima, sem prioridade definida ainda.

## Próximo — Fase 6 — Redesign das Telas Internas

Repaginação visual das telas do dashboard.

## Em seguida — LIVO-012 (WhatsApp Z-API)

## Em seguida — Fase LIVO Prime

## Depois — Decisão estratégica: LIVO Beauty/Saúde unificado

**Nova frente sinalizada em 16/07**, ainda não iniciada. Requer sessão dedicada para:
- Definir nome de produto e branding
- Decidir reaproveitamento de base de código (mesmo multi-tenant com `VerticalType`,
  já documentado desde antes) vs. projeto novo
- Mapear diferenças reais de domínio entre Beauty (reskin, baixo esforço) e
  profissionais de saúde (prontuário, dado sensível LGPD, sessões recorrentes, ausência
  de conceito de "equipe/loja" — esforço significativamente maior)
- Recomendação preliminar: tratar como dois esforços sequenciais, não um pacote único

## Por último — Fase 5 — Expansão Multi-Vertical (LIVO Beauty/Pet/Fit/Med original)

Conforme `LIVO_OPERATING_SYSTEM.md` — pode ser substituída ou informada pela decisão
estratégica acima, a depender do rumo escolhido na próxima sessão.

---

# PRÓXIMO PASSO IMEDIATO

Sessão de 16/07 encerrada com a reforma visual do agendamento público completa e em
produção (`livobarber.com.br`). Próxima sessão recomendada: discussão estratégica
dedicada sobre o LIVO Beauty/Saúde unificado, começando pelas decisões de escopo listadas
acima, antes de qualquer diagnóstico técnico ou código.

FIM DO DOCUMENTO
