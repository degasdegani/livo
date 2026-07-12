# ADR-002 — Antecipação do Redesign Visual (LIVO-032)

**Status:** Aprovado
**Data:** 08/07/2026
**Decisor:** Edu (Founder/CPO/CTO)
**Documento relacionado:** LIVO_BACKLOG.md — Fase 6

---

## Contexto

O LIVO-032 (redesign completo com base em templates de referência) estava
registrado no backlog como **bloqueado** até o cumprimento de quatro
condições:

1. LIVO-030 (migração Asaas) concluída
2. LIVO-031 (Embaixadores) no ar
3. "Errinhos" pendentes reportados e corrigidos
4. Sistema estável em produção

Nenhuma dessas condições foi cumprida até o momento desta decisão.

## Gatilho da mudança

A identidade visual do LIVO BARBER foi completamente reestruturada
(nova wordmark + símbolo da navalha, paleta preto/dourado, tipografia
serifada). O site institucional atual (paleta rosa/cinza, tipografia
sans genérica, ícones emoji) está em dissonância direta com a nova
identidade e, na avaliação do founder, não transmite a autoridade e
seriedade que o produto exige. Manter o site desalinhado da marca por
mais tempo foi avaliado como custo maior do que o risco de antecipar o
redesign.

## Decisão

O LIVO-032 é **desmembrado em dois sub-tickets**, com o site
institucional antecipado e as telas internas mantidas no cronograma
original:

- **LIVO-032-A — Redesign do site institucional** (`livobarber.com.br`)
  **Destravado agora.** Não depende de LIVO-030/031/estabilidade do
  sistema, pois é uma superfície separada do produto logado (menor
  risco: não toca em fluxo de billing, autenticação ou dados de
  cliente).
- **LIVO-032-B — Redesign das telas internas** (dashboard, agenda,
  comandas, etc.)
  **Permanece bloqueado** pelas condições originais do ADR anterior
  (LIVO-030 concluído + LIVO-031 no ar + errinhos corrigidos + sistema
  estável). Alterar UI logada tem risco direto sobre a operação diária
  de barbearias pagantes — o racional original de esperar continua
  válido para essa parte.

## Consequências

- O Design System formal (tokens de cor, tipografia, componentes)
  precisa ser produzido _antes_ da implementação do site, conforme já
  prescrito no LIVO-032 original — isso não muda.
- LIVO-031 (Embaixadores) continua prioritário e deve ser publicado
  junto com o novo site institucional, já que a peça do TX Barbearia
  já está na nova identidade visual e serve como referência de marca.
- Este ADR não altera a prioridade de LIVO-030 (migração Asaas), que
  segue bloqueada por fator externo.

## Atualização de status no backlog

| Ticket                          | Status anterior    | Novo status                                    |
| ------------------------------- | ------------------ | ---------------------------------------------- |
| LIVO-032                        | Bloqueado (Fase 6) | Desmembrado                                    |
| LIVO-032-A (site institucional) | —                  | Ativo — Fase 1.5                               |
| LIVO-032-B (telas internas)     | —                  | Bloqueado (mantém condições originais, Fase 6) |
