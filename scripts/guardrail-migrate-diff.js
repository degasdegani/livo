/**
 * Guardrail: bloqueia migrations com DROP (TABLE/COLUMN/CONSTRAINT/INDEX) nao aprovado.
 * DROPs sao operacoes destrutivas e irreversiveis em producao (perda de dados/coluna).
 *
 * Funcionamento:
 * - So escaneia migrations MAIS NOVAS que o baseline (scripts/.migrate-guard-baseline.json).
 *   Migrations antigas ja aplicadas em producao nao sao re-escaneadas.
 * - Migration nova com DROP so passa se o nome dela estiver em
 *   scripts/.migrate-guard-allowlist.json (aprovacao explicita apos revisao humana).
 * - Ao final de uma execucao bem-sucedida, o baseline avanca para a migration mais recente.
 *
 * Uso: node scripts/guardrail-migrate-diff.js
 * Exit 0 = OK. Exit 1 = DROP nao aprovado encontrado (bloqueia o processo que chamou).
 */

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");
const BASELINE_FILE = path.join(process.cwd(), "scripts", ".migrate-guard-baseline.json");
const ALLOWLIST_FILE = path.join(process.cwd(), "scripts", ".migrate-guard-allowlist.json");

const DROP_REGEX = /DROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)/gi;

function listMigrationFolders() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function main() {
  const migrations = listMigrationFolders();

  if (migrations.length === 0) {
    console.log("[guardrail-migrate-diff] OK - nenhuma migration encontrada.");
    process.exit(0);
  }

  const mostRecent = migrations[migrations.length - 1];

  const baselineExisted = fs.existsSync(BASELINE_FILE);
  const baseline = readJson(BASELINE_FILE, { lastCheckedMigration: mostRecent });

  if (!baselineExisted) {
    writeJson(BASELINE_FILE, { lastCheckedMigration: mostRecent });
    console.log(
      `[guardrail-migrate-diff] OK - baseline criado em ${path.relative(process.cwd(), BASELINE_FILE)} (lastCheckedMigration = "${mostRecent}"). Migrations existentes aposentadas, nada escaneado nesta execucao.`,
    );
    process.exit(0);
  }

  const allowlist = readJson(ALLOWLIST_FILE, { allowedDropMigrations: [] });
  if (!fs.existsSync(ALLOWLIST_FILE)) {
    writeJson(ALLOWLIST_FILE, allowlist);
  }
  const allowedDropMigrations = new Set(allowlist.allowedDropMigrations || []);

  const newMigrations = migrations.filter((name) => name > baseline.lastCheckedMigration);

  if (newMigrations.length === 0) {
    console.log("[guardrail-migrate-diff] OK - nenhuma migration nova desde o ultimo baseline.");
    process.exit(0);
  }

  const blocked = [];

  for (const migrationName of newMigrations) {
    const sqlPath = path.join(MIGRATIONS_DIR, migrationName, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;

    const sql = fs.readFileSync(sqlPath, "utf8");
    const matches = sql.match(DROP_REGEX);
    if (!matches) continue;

    if (allowedDropMigrations.has(migrationName)) {
      console.warn(
        `[guardrail-migrate-diff] AVISO - "${migrationName}" contem DROP (${[...new Set(matches)].join(", ")}) mas esta na allowlist (excecao aprovada).`,
      );
      continue;
    }

    blocked.push({ migrationName, matches: [...new Set(matches)] });
  }

  if (blocked.length > 0) {
    console.error("\n[guardrail-migrate-diff] BLOQUEADO - migration com DROP nao aprovado:\n");
    for (const { migrationName, matches } of blocked) {
      console.error(`  - ${migrationName}: ${matches.join(", ")}`);
    }
    console.error(
      "\nPara aprovar, adicione o nome desta migration em scripts/.migrate-guard-allowlist.json apos revisao.\n",
    );
    process.exit(1);
  }

  writeJson(BASELINE_FILE, { lastCheckedMigration: mostRecent });
  console.log(
    `[guardrail-migrate-diff] OK - ${newMigrations.length} migration(ns) nova(s) verificada(s). Baseline atualizado para "${mostRecent}".`,
  );
  process.exit(0);
}

main();
