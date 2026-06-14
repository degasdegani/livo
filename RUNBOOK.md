# LIVO — Runbook Operacional

> Guia definitivo para deploy, backup, restore, rollback e resposta a incidentes.

---

## Índice

1. [Arquitetura de Produção](#1-arquitetura-de-produção)
2. [Variáveis de Ambiente](#2-variáveis-de-ambiente)
3. [Checklist de Deploy](#3-checklist-de-deploy)
4. [Procedimento de Rollback](#4-procedimento-de-rollback)
5. [Migrations de Banco](#5-migrations-de-banco)
6. [Backup e Restore](#6-backup-e-restore)
7. [Disaster Recovery](#7-disaster-recovery)
8. [Health Check](#8-health-check)
9. [Monitoramento e Alertas](#9-monitoramento-e-alertas)
10. [Resposta a Incidentes](#10-resposta-a-incidentes)

---

## 1. Arquitetura de Produção

| Componente     | Serviço             | Observação                                      |
|----------------|---------------------|-------------------------------------------------|
| Frontend/API   | Vercel              | Next.js 16 App Router, Edge + Node.js runtimes  |
| Banco de dados | Neon PostgreSQL     | Serverless Postgres, sslmode=require            |
| Email          | Resend              | Transactional email (confirmações, convites)    |
| Pagamentos     | Asaas               | Assinaturas + webhooks                          |
| AI             | Anthropic (Claude)  | Lívia — assistente de barbearia                 |
| Auth           | NextAuth v5         | Google OAuth + JWT sessions                     |
| Erros          | Sentry              | Server + Client error tracking                  |

---

## 2. Variáveis de Ambiente

Copiar `.env.example` → `.env` e preencher. Ver detalhes em `.env.example`.

**Críticas (sem elas o app não sobe em produção):**

| Variável             | Onde obter                                  |
|----------------------|---------------------------------------------|
| `DATABASE_URL`       | Neon Console → Connection Details           |
| `AUTH_SECRET`        | `openssl rand -base64 32`                   |
| `GOOGLE_CLIENT_ID`   | Google Cloud Console → Credentials          |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials        |
| `RESEND_API_KEY`     | resend.com → API Keys                       |
| `ASAAS_KEY`          | asaas.com → Integrações → Chave de API      |
| `ASAAS_WEBHOOK_TOKEN`| Definir valor próprio + cadastrar no Asaas  |
| `ANTHROPIC_API_KEY`  | console.anthropic.com → API Keys            |

**Recomendadas (app funciona, mas sem observabilidade):**

| Variável                  | Descrição                          |
|---------------------------|------------------------------------|
| `SENTRY_DSN`              | Sentry server-side DSN             |
| `NEXT_PUBLIC_SENTRY_DSN`  | Sentry client-side DSN             |
| `SENTRY_ORG`              | Slug da organização no Sentry      |
| `SENTRY_PROJECT`          | Nome do projeto no Sentry          |

**Como configurar no Vercel:**
```
Vercel Dashboard → Project → Settings → Environment Variables
```
Adicionar cada variável para o ambiente Production. Nunca usar `.env` local em deploy.

---

## 3. Checklist de Deploy

### Pré-deploy

- [ ] Migrations testadas em staging (se houver)
- [ ] `npx tsc --noEmit` — zero erros TypeScript
- [ ] `npx vitest run` — todos os testes passando
- [ ] Variáveis de ambiente atualizadas no Vercel (se houver novas)
- [ ] `NEXT_PUBLIC_ASAAS_SANDBOX=false` em produção
- [ ] Sentry DSN configurado e funcionando

### Durante o deploy

O deploy é automático via Vercel ao fazer push na branch `main`.

Fluxo automático:
1. Vercel detecta o push
2. Executa `prisma generate && next build`
3. Se o build passar → deploy atômico (sem downtime)
4. Se o build falhar → versão anterior permanece ativa

Para deploy manual:
```bash
vercel --prod
```

### Pós-deploy

- [ ] Verificar health check: `GET https://livobarber.com.br/api/health`
- [ ] Resposta esperada: `{ "status": "ok" }`
- [ ] Verificar Sentry — sem novos erros críticos nos primeiros 5 minutos
- [ ] Testar fluxo crítico: login → dashboard
- [ ] Verificar que webhooks Asaas estão recebendo (testar no painel Asaas)

---

## 4. Procedimento de Rollback

### Rollback de Deploy (Vercel — instantâneo)

O Vercel mantém histórico de todos os deploys. Rollback leva menos de 1 minuto e não tem downtime.

```
Vercel Dashboard
  → Project (livo)
  → Deployments
  → Encontrar o último deploy bom
  → "..." → "Promote to Production"
```

Ou via CLI:
```bash
# Listar últimos deploys
vercel ls

# Promover deploy específico
vercel promote <deployment-url>
```

**Quando usar:** Bug crítico em produção que não pode ser hotfixed rapidamente.

### Rollback de Migration (Banco)

Migrações Prisma não têm rollback automático. Procedimento:

1. **Verificar qual migration foi aplicada:**
   ```bash
   npx prisma migrate status
   ```

2. **Reverter migration manualmente** (conectar ao banco Neon):
   ```sql
   -- Exemplo: desfazer adição de coluna
   ALTER TABLE "comandas" DROP COLUMN IF EXISTS "nova_coluna";
   
   -- Remover o registro da migration da tabela de controle
   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260614_nome_da_migration';
   ```

3. **Remover o arquivo de migration** do diretório `prisma/migrations/`

4. **Confirmar estado:**
   ```bash
   npx prisma migrate status
   ```

**Atenção:** Se a migration adicionou dados (seedou tabelas), esses dados precisam ser limpos manualmente antes de reverter o schema.

---

## 5. Migrations de Banco

### Criar nova migration

```bash
# Desenvolvimento local
npx prisma migrate dev --name nome_descritivo

# Exemplo
npx prisma migrate dev --name add_client_referral
```

### Aplicar em produção

O deploy automático **não** roda migrations automaticamente. Aplicar antes do deploy:

```bash
# Apontar para banco de produção
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Ou via script (com DATABASE_URL no ambiente):
```bash
npx prisma migrate deploy
```

### Verificar estado das migrations

```bash
npx prisma migrate status
```

### Gerar cliente Prisma (sem migration)

```bash
npx prisma generate
```

---

## 6. Backup e Restore

### Backup Automático — Neon

O Neon realiza backups automáticos com:
- **Point-in-time recovery (PITR):** até 7 dias no plano gratuito, 30 dias no plano pago
- **Snapshots automáticos:** a cada hora
- **Replicação:** dados replicados em múltiplas zonas de disponibilidade

**Nenhuma ação manual necessária para backups regulares.**

### Backup Manual — Export completo

```bash
# Exportar banco completo
pg_dump "$DATABASE_URL" --no-acl --no-owner -Fc -f "livo-backup-$(date +%Y%m%d-%H%M%S).dump"

# Exportar somente schema
pg_dump "$DATABASE_URL" --schema-only -f "livo-schema-$(date +%Y%m%d).sql"

# Exportar somente dados (sem schema)
pg_dump "$DATABASE_URL" --data-only -Fc -f "livo-data-$(date +%Y%m%d).dump"
```

Guardar backups em: Neon S3 ou Google Drive (pasta "LIVO Backups").

### Restore — Point-in-Time Recovery (Neon)

```
Neon Console
  → seu projeto
  → Branches
  → "Create branch from point in time"
  → Selecionar data/hora desejada
  → Criar branch de restore
```

Após criar o branch de restore:
1. Verificar os dados no branch de restore
2. Se correto: promover o branch para principal
3. Atualizar `DATABASE_URL` no Vercel para apontar para o branch restaurado

### Restore — A partir de dump manual

```bash
# Restaurar dump completo
pg_restore --no-acl --no-owner -d "$DATABASE_URL" livo-backup.dump

# Restaurar arquivo SQL
psql "$DATABASE_URL" < livo-backup.sql
```

---

## 7. Disaster Recovery

### Cenários e RTO/RPO

| Cenário                              | RTO estimado | RPO        | Procedimento                              |
|--------------------------------------|--------------|------------|-------------------------------------------|
| Bug em deploy (código)               | < 1 min      | zero       | Rollback de deploy no Vercel              |
| Corrupção de dados (sem schema)      | < 15 min     | até 1 hora | PITR no Neon                              |
| Corrupção de schema (migration ruim) | 30–60 min    | até 1 hora | PITR + migration manual + rollback deploy |
| Conta Neon comprometida              | 1–4 horas    | até 24h    | Restaurar dump em novo projeto Neon       |
| Conta Vercel comprometida            | 30 min       | zero       | Re-deploy em nova conta a partir do git   |
| Credenciais vazadas                  | imediato     | zero       | Rotacionar credenciais (ver abaixo)       |

### Procedimento de Rotação de Credenciais

Se `DATABASE_URL`, `AUTH_SECRET`, ou outra credencial for comprometida:

1. **Gerar nova credencial** no serviço (Neon, Google, Asaas etc.)
2. **Atualizar no Vercel:** Settings → Environment Variables → editar valor
3. **Re-fazer deploy:** o Vercel não re-deploya automaticamente ao mudar env vars
   ```bash
   vercel --prod
   ```
4. **Invalidar sessões ativas** (se `AUTH_SECRET` foi alterado — todos os usuários serão deslogados automaticamente)
5. **Revogar credencial antiga** no painel do serviço

**ALERTA CRÍTICO:** O arquivo `.env` com credenciais de produção foi detectado no histórico do git.
Ação imediata necessária:
- [ ] Revogar e rotacionar: `DATABASE_URL` (Neon → Reset password)
- [ ] Revogar e rotacionar: todos os outros secrets do `.env` comprometido
- [ ] Considerar `git filter-repo` para remover o arquivo do histórico

---

## 8. Health Check

### Endpoint

```
GET /api/health
```

### Resposta esperada (saudável)

```json
{
  "status": "ok",
  "timestamp": "2026-06-14T12:00:00.000Z",
  "version": "unknown",
  "checks": {
    "database": {
      "status": "ok",
      "latencyMs": 45
    },
    "env": {
      "status": "ok",
      "missingCritical": [],
      "missingOptional": []
    }
  }
}
```

### Códigos HTTP

| Status HTTP | Significado                                          |
|-------------|------------------------------------------------------|
| `200`       | Saudável ou degradado (opcional ausente)             |
| `503`       | Não saudável (banco inacessível ou var crítica ausente) |

### Monitoramento automático

Configurar uptime monitoring externo (Vercel, UptimeRobot, Better Uptime) apontando para `/api/health` a cada 1 minuto.

---

## 9. Monitoramento e Alertas

### Sentry

- Todos os erros de Server Actions, Route Handlers e Server Components são capturados automaticamente via `instrumentation.ts`
- Erros de cliente (browser) são capturados via `sentry.client.config.ts`
- Configurar alertas de Sentry para: `fatal`, `error` — notificar via email/Slack

### Logs (Vercel)

```
Vercel Dashboard → Project → Logs
```

Filtros úteis:
- `status:500` — erros de servidor
- `path:/api/webhook` — logs do webhook Asaas
- `path:/api/livia` — logs da IA Lívia

### Correlation ID

Toda request recebe um `x-correlation-id` injetado pelo middleware. Incluir o correlation ID ao reportar erros para rastrear a request completa nos logs do Vercel.

---

## 10. Resposta a Incidentes

### Severidade 1 — Produção fora do ar

1. Verificar `/api/health` → identificar componente falho
2. Se banco: verificar Neon status page
3. Se código: fazer rollback de deploy imediato (< 1 min)
4. Comunicar usuários se indisponibilidade > 5 min
5. Post-mortem em até 24h

### Severidade 2 — Funcionalidade crítica degradada

(Ex: pagamentos falhando, login falhando)

1. Verificar Sentry — identificar erro e stack trace
2. Verificar se é problema de env var, configuração ou código
3. Se env var: atualizar no Vercel + re-deploy
4. Se código: hotfix na branch main → deploy automático
5. Testar funcionalidade após deploy

### Severidade 3 — Bug não crítico

1. Registrar no sistema de issues
2. Priorizar para próximo ciclo de desenvolvimento
3. Nenhuma ação imediata necessária

### Contatos de Emergência dos Serviços

| Serviço    | Status Page                             | Suporte                        |
|------------|-----------------------------------------|--------------------------------|
| Vercel     | vercel-status.com                       | vercel.com/support             |
| Neon       | neonstatus.com                          | console.neon.tech/app/support  |
| Asaas      | status.asaas.com                        | ajuda.asaas.com                |
| Resend     | resendstatus.com                        | resend.com/support             |
| Anthropic  | status.anthropic.com                    | support.anthropic.com          |
| Sentry     | status.sentry.io                        | sentry.io/support              |

---

*Última atualização: 2026-06-14*
