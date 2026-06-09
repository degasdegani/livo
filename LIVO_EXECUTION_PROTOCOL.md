# LIVO_EXECUTION_PROTOCOL.md

Versão: 1.0
Status: Ativo
Última atualização: 09/06/2026

---

# PROPÓSITO

Este documento define as regras obrigatórias de execução para qualquer IA, desenvolvedor, agente autônomo ou colaborador que trabalhe no projeto LIVO.

O objetivo é garantir que:

- Nenhuma funcionalidade crítica seja quebrada.
- Nenhuma decisão arquitetural importante seja tomada sem análise.
- O projeto evolua seguindo a visão oficial do LIVO.
- A dívida técnica seja reduzida continuamente.
- A plataforma permaneça consistente entre código, produto e documentação.

Este documento possui prioridade superior a qualquer tarefa isolada.

---

# ORDEM DE PRECEDÊNCIA

Em caso de conflito entre documentos:

1. LIVO_EXECUTION_PROTOCOL.md
2. LIVO_ARCHITECTURE_DECISIONS.md
3. LIVO_PROJECT_STATUS.md
4. LIVO_ROADMAP.md
5. Solicitação atual do usuário

Se uma tarefa violar este protocolo, ela deve ser interrompida e revisada.

---

# ESTADO ATUAL DO PROJETO

O LIVO encontra-se em estágio:

MVP Funcional + Consolidação Técnica

O produto já possui:

- Autenticação
- Multi-tenant
- Agenda
- Clientes
- Comandas
- Relatórios
- Estoque
- Billing
- Convites
- IA Lívia

O foco atual NÃO é criar dezenas de funcionalidades.

O foco atual é:

- corrigir riscos críticos
- estabilizar arquitetura
- reduzir dívida técnica
- preparar escala

---

# REGRA MÁXIMA

Antes de qualquer implementação:

1. Entender a tarefa.
2. Avaliar impacto.
3. Verificar arquitetura.
4. Verificar documentação.
5. Propor plano.
6. Executar.
7. Validar.
8. Documentar.

Nunca implementar diretamente sem análise.

---

# PROIBIÇÕES ABSOLUTAS

## Nunca alterar migrations antigas

Proibido:

- editar migrations existentes
- reescrever histórico Prisma
- modificar migrations já executadas

Permitido:

- criar nova migration

---

## Nunca deletar WaitlistLead

A tabela WaitlistLead contém leads reais.

É proibido:

- remover
- limpar
- resetar

---

## Nunca remover proteção Lifetime

Qualquer lógica semelhante a:

planStatus != "lifetime"

deve permanecer protegida.

O plano Lifetime é permanente.

---

## Nunca alterar autenticação sem ADR

Qualquer mudança em:

- NextAuth
- JWT
- OAuth
- Middleware
- RBAC

exige:

ADR + validação arquitetural.

---

## Nunca alterar billing sem análise

Qualquer alteração em:

- Asaas
- Assinaturas
- Webhooks
- Trial
- Planos

deve gerar:

- análise de impacto
- checklist
- plano de rollback

---

## Nunca quebrar multi-tenancy

Toda query operacional deve respeitar:

barbershopId

Nenhuma consulta pode acessar dados de outro tenant.

---

# ÁREAS CRÍTICAS

São consideradas áreas críticas:

- Auth
- Billing
- Membership
- Convites
- Multi-tenant
- Comandas
- Estoque
- Lívia
- Relatórios financeiros

Mudanças nessas áreas exigem:

1. plano prévio
2. validação
3. testes

---

# PRIORIDADE OFICIAL

## P0

Bloqueadores

### P0.1

Corrigir role hardcoded

Arquivo:

layout.tsx

Problema:

const role = "owner"

Impacto:

RBAC visual quebrado.

---

### P0.2

Remover rotas de debug

/api/env-test

/api/test-env

/api/auth-test

/api/auth-test-2

Impacto:

Possível exposição de secrets.

---

### P0.3

Rate limiting da Lívia

Objetivo:

Evitar explosão de custos.

---

### P0.4

Converter planStatus para Enum

Objetivo:

Eliminar strings inválidas.

---

### P0.5

Criar índices explícitos

Principalmente:

barbershopId

---

### P0.6

Atualizar documentação oficial

Manter docs sincronizados com código.

---

# P1

Produto Completo

Prioridades:

- CRUD Serviços
- CRUD Profissionais
- Horários de Funcionamento
- Agenda Completa
- Upload Avatar
- Upload Logo
- Persistência da Lívia

---

# P2

Robustez

Prioridades:

- Testes
- Sentry
- Audit Log
- CI/CD
- Logger estruturado

---

# P3

Escala

Prioridades:

- Event Layer
- WhatsApp Assistant
- Analytics
- Automações
- Knowledge Graph
- Multi-Vertical

---

# PROCESSO OBRIGATÓRIO DE EXECUÇÃO

Para qualquer tarefa:

## ETAPA 1

Diagnóstico

Responder:

- O que será alterado?
- Onde será alterado?
- Qual impacto?

---

## ETAPA 2

Plano

Responder:

- arquivos envolvidos
- dependências
- riscos
- estratégia

---

## ETAPA 3

Implementação

Executar apenas após aprovação.

---

## ETAPA 4

Validação

Executar:

- typecheck
- lint
- build

Quando possível:

- testes

---

## ETAPA 5

Documentação

Atualizar:

- status
- roadmap
- debt

quando aplicável.

---

# PADRÃO DE QUALIDADE

Todo código novo deve:

- ser tipado
- seguir TypeScript strict
- evitar any
- evitar duplicação
- respeitar design system
- respeitar RBAC
- respeitar multi-tenant

---

# PADRÃO DE COMPONENTES

Preferir:

- Server Components
- Server Actions
- Shadcn UI
- Tailwind Tokens

Evitar:

- lógica crítica em Client Components
- cores hardcoded
- estilos inline excessivos

---

# PADRÃO DE BANCO

Toda nova tabela deve possuir:

- id
- createdAt
- updatedAt

Quando aplicável:

- barbershopId
- índices
- constraints

---

# PADRÃO DE APIs

Toda API nova deve:

- autenticar usuário
- validar entrada
- tratar erros
- retornar resposta consistente
- respeitar tenant

---

# PADRÃO DE IA

A Lívia deve evoluir nesta ordem:

Fase 1
Contexto operacional

Fase 2
Persistência de conversa

Fase 3
Memória por tenant

Fase 4
Knowledge Graph

Fase 5
Automações

Nenhuma automação deve ser criada antes da persistência de memória.

---

# CRITÉRIOS DE PRONTO

Uma tarefa só é considerada concluída quando:

- implementação finalizada
- typecheck aprovado
- lint aprovado
- documentação atualizada
- sem regressões identificadas

---

# DEFINIÇÃO DE SUCESSO DO LIVO

Curto prazo:

Sistema de gestão de barbearia sólido.

Médio prazo:

Sistema operacional da barbearia.

Longo prazo:

Plataforma de inteligência operacional multi-vertical.

Visão final:

LIVO torna-se a camada operacional inteligente de pequenos negócios de serviço.

---

# REGRA FINAL

Antes de qualquer alteração relevante, responder:

"Esta mudança aproxima o LIVO da visão oficial ou apenas adiciona complexidade?"

Se a resposta for complexidade sem ganho estratégico, não implementar.
