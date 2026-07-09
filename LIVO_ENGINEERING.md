# LIVO ENGINEERING

Versão: 1.0
Nível 7 na hierarquia documental (LIVO_INDEX.md)

---

# PROPÓSITO

Este documento reúne, em um único lugar, todas as regras arquiteturais invioláveis do ecossistema LIVO que hoje existem apenas como convenção tácita, memória de sessões anteriores ou enforcement automatizado sem registro formal.

Sua criação responde diretamente ao Princípio de Governança do LIVO_DECISION_FRAMEWORK.md:

"Nenhuma regra importante deve existir apenas no código."

Se uma regra crítica não está aqui, ela não existe para fins de governança — deve ser adicionada antes de ser cobrada de qualquer execução futura (humana ou IA).

---

# POSIÇÃO NA HIERARQUIA

Este documento está subordinado a:

1. README.md
2. LIVO_INDEX.md
3. LIVO_OPERATING_SYSTEM.md
4. LIVO_DECISION_FRAMEWORK.md

Em caso de conflito entre uma regra técnica aqui descrita e a visão de produto ou experiência do usuário, os documentos de nível superior vencem — mas nenhuma regra de segurança de dados (proteção de registros, escopo multi-tenant) pode ser flexibilizada por conveniência de produto.

---

# 1. REGRAS INVIOLÁVEIS DE PRODUÇÃO

Estas regras nunca podem ser violadas em nenhuma sessão, nenhum ticket, nenhuma refatoração — independentemente de quem execute o trabalho.

## 1.1 Registros protegidos

- A barbearia **TX Barbearia** possui `planStatus=lifetime` e `seatLimitOverride=-1`. Nunca deve ser bloqueada, cobrada ou ter esses campos alterados por nenhuma lógica de billing, migration ou script.
- Os **14 registros de `WaitlistLead`** nunca devem ser deletados ou modificados.
- Antes de qualquer `DELETE` em contas de usuário: rodar `SELECT` de barbearia e membership para confirmar que não há dado real antes de prosseguir.

## 1.2 Schema e banco de dados

- `@@map()` só é aplicado em nomes de tabela — nunca em campos individuais.
- `$transaction` do Prisma é sempre usado como callback assíncrono (`prisma.$transaction(async (tx) => {...})`), nunca como array de promises.
- Toda escrita no banco é escopada por `barbershopId`. Nenhuma query de escrita pode cruzar fronteiras de tenant.
- `prisma migrate diff` é obrigatório antes de qualquer `migrate dev`. Qualquer `DROP` (TABLE/COLUMN/CONSTRAINT/INDEX) é hard stop até revisão explícita.

## 1.3 Runtime e autenticação

- `Prisma` (ou `@prisma/client`, ou `db.`) nunca aparece dentro dos callbacks `jwt` ou `session` do Auth.js — incompatibilidade com Edge Runtime. Essa regra existe porque sua violação já causou uma queda de login em produção para toda a base de usuários.
- Tratamento de sessão inválida pertence a Server Components (Node Runtime), nunca aos callbacks `jwt`/`session`.

## 1.4 Encoding e arquivos-fonte

- Nenhum emoji cru em arquivos `.ts`/`.tsx`. Caracteres astrais (`> 0xFFFF`) e `U+FE0F` corrompem para `\uFFFD` no Windows durante escrita de arquivo.
- Exceção: ícones de UI isolados fora de risco de corrupção (`✓ 0x2713`, `✕ 0x2715`, `✦ 0x2726`, `✉ 0x2709`, `⚠ 0x26A0`) — allowlist explícita, não extensível sem atualizar o guardrail.
- Emoji destinado ao cliente final (WhatsApp, e-mail, mensagens da Lívia) é preservado via escape Unicode `\u{XXXX}` no arquivo-fonte, mantendo o emoji real na entrega.

## 1.5 Qualidade e validação

- `npx tsc --noEmit` deve retornar 0 erros antes de qualquer tarefa ser declarada concluída.
- Validação de mudanças visuais/funcionais ocorre em preview deployments da Vercel — nunca em localhost (restrição de performance do ambiente local).

---

# 2. GUARDRAILS AUTOMATIZADOS

Três scripts standalone (dependência apenas de `fs`/`path`, sem instalar ESLint) protegem as regras da Seção 1 automaticamente a cada build. Todos plugados em `"build"` no `package.json`, executados nesta ordem:

## 2.1 `scripts/guardrail-migrate-diff.js`

- **Protege:** regra 1.2 (hard stop em `DROP` de migration).
- **Mecanismo:** baseline versionado (`scripts/.migrate-guard-baseline.json`) marca a última migration já aprovada; só migrations mais novas que o baseline são escaneadas. Allowlist versionada (`scripts/.migrate-guard-allowlist.json`) permite exceção explícita e auditável por nome de migration.
- **Por quê baseline em vez de escanear tudo:** 4 migrations antigas (maio/junho 2026) já têm DROP legítimo aplicado em produção (refatorações de nomenclatura e reestruturação de comissão); a regra não é retroativa.
- **Por quê allowlist em vez de env var:** uma flag global pode ficar ligada silenciosamente e virar guardrail decorativo; a allowlist fica visível em code review.
- **Comando isolado:** `npm run guardrail:migrate-diff`
- **Ticket de origem:** LIVO-016. Commit `f35fbb8`.

## 2.2 `scripts/guardrail-prisma-edge.js`

- **Protege:** regra 1.3 (Prisma fora de callbacks `jwt`/`session`).
- **Mecanismo:** isola o corpo dos callbacks `jwt` e `session` em `src/auth.ts` via parsing de chaves balanceadas; bloqueia se detectar `db.`, `prisma.`, `PrismaClient` ou import de `@prisma/client` dentro desses blocos. Não gera falso-positivo em `authorize`/`events`, que usam Prisma legitimamente em Node Runtime.
- **Comando isolado:** `npm run guardrail:prisma-edge`
- **Ticket de origem:** LIVO-004. Commit `da62f0a`.

## 2.3 `scripts/guardrail-emoji.js`

- **Protege:** regra 1.4 (emoji cru em `.ts`/`.tsx`).
- **Mecanismo:** varre `src/**/*.ts(x)`, bloqueia qualquer codepoint astral, qualquer `U+FE0F`, e qualquer caractere em range de emoji fora da allowlist de 5 codepoints listada em 1.4.
- **Comando isolado:** `npm run guardrail:emoji`
- **Ticket de origem:** LIVO-027. Limpeza de 34 ocorrências legadas (17 → lucide-react, 9 → escape Unicode). Commit `db0b13e`.

## 2.4 Adicionar um novo guardrail

Ao criar um novo guardrail: seguir o mesmo padrão (script standalone, sem dependência de banco, plugado em `"build"`), documentar aqui na Seção 2, e registrar o ticket/commit de origem.

---

# 3. PADRÕES DE EXECUÇÃO E VERIFICAÇÃO

## 3.1 Sequenciamento

- Diagnóstico read-only primeiro, depois implementação, depois validação em produção — nunca inverter essa ordem.
- Comandos são executados um de cada vez, com resultado reportado antes de prosseguir.
- `npx tsc --noEmit` é conferido antes de qualquer avanço de etapa.

## 3.2 Verificação de estado do banco

- **Neon SQL Editor** (queries ao vivo) é a única fonte confiável para verificar estado de conta — nunca Prisma Studio, que mostra cache desatualizado.
- IDs do tipo CUID contêm caracteres visualmente ambíguos (`l`/`1`, `0`/`O`). Nunca digitar um ID manualmente — sempre consultar via subquery usando `ownerId`/`slug`.

## 3.3 Governança de mudança

- Nenhuma mudança estrutural (schema, arquitetura, regra de negócio crítica) ocorre sem um ADR formal quando ela se desvia de uma condição de roadmap já documentada.
- Commits são feitos por ticket, não por blob de feature — exceto quando dois tickets modificam o mesmo arquivo de forma entrelaçada (ex: `package.json`), caso em que um commit único com ambos os tickets citados é aceitável.

---

# 4. DÉBITO TÉCNICO E EXCEÇÕES CONHECIDAS

Registradas aqui para não serem redescobertas do zero em sessões futuras.

- **`ASAAS_API_KEY`** é uma variável de ambiente órfã no Vercel, não referenciada em nenhum código. A chave ativa é `ASAAS_KEY`, compartilhada entre billing principal e Clube de Assinatura. Remoção da variável órfã é debt de limpeza sem urgência (LIVO-033).
- **4 migrations antigas** (maio/junho 2026) contêm `DROP` legítimo, anteriores ao baseline do guardrail de migrate-diff — não re-escaneadas, por decisão explícita (ver 2.1).
- **`src/components/landing/ai-section.tsx`** (`AISection`) está no barrel export mas não é renderizado em nenhuma página — decisão de destino pendente (LIVO-036, baixa prioridade).

---

# 5. REFERÊNCIAS CRUZADAS

- ADR-002 — antecipação do redesign institucional (LIVO-032-A) em relação às condições de bloqueio originais do LIVO-032.
- LIVO_BACKLOG.md — histórico completo de tickets, incluindo os três guardrails desta seção 2 e as decisões técnicas registradas durante sua implementação.

---

# REGRA FINAL

Todo novo padrão arquitetural inviolável — descoberto por incidente, decisão de founder, ou revisão de código — é adicionado a este documento antes de ser cobrado em qualquer execução futura, humana ou de IA.

Se não está aqui, não existe.

---

FIM DO DOCUMENTO
