# ADR-005 — Sistema de Avaliações e Reforma Visual do Agendamento Público

## Status

Aceito

## Contexto

Reforma visual do fluxo público de agendamento (`[slug]/**`) exigiu, como pré-requisito
de dado real, dois conceitos que não existiam: (1) ano de início de atuação do
profissional, (2) sistema de avaliações de clientes. Decisão do founder: construir
ambos como parte real do produto, não como dado decorativo/mockado.

## Decisão

- `Professional.yearStarted` (Int?) e `Professional.specialties` (String[]) — aditivos.
- Model `Review` novo, vinculado 1:1 a `Appointment` (via `appointmentId` @unique),
  evitando spam/duplicidade.
- Cache de agregação (`avgRating`, `reviewCount`) em `Professional`, recalculado a cada
  novo Review na mesma transação — não on-the-fly, por escalabilidade de leitura pública.
- Coleta via e-mail (Resend) disparado quando `Appointment.status` → `completed`.
  WhatsApp fica para quando LIVO-012 (Z-API) existir — canal secundário futuro, não
  bloqueante.
- `clientName` no Review é snapshot de texto, não FK obrigatória — compatível com
  anonimização LGPD futura sem quebrar histórico.

## Consequências

- Sistema visual público (`src/components/public-booking/`) passa a existir como
  camada própria, separada do DS do dashboard — mesmo precedente já aberto pelo
  isolamento de Poppins (institucional) vs. Satoshi (dashboard).
- Paleta vermelho/preto/dourado é identidade pública fixa do LIVO Barber, não
  customizável por tenant (schema não tem campo de cor hoje — decisão consciente
  de não adicionar theming dinâmico neste momento).
