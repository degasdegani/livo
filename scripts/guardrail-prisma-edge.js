/**
 * Guardrail: bloqueia uso de Prisma/db dentro dos callbacks jwt/session do Auth.js.
 * Esses callbacks rodam em Edge Runtime (via middleware) e Prisma nao e compativel.
 * Ja causou um outage de login em producao (LIVO-004).
 *
 * Uso: node scripts/guardrail-prisma-edge.js
 * Exit 0 = OK. Exit 1 = violacao encontrada (bloqueia o processo que chamou).
 */

const fs = require("fs");
const path = require("path");

const TARGET_FILE = path.join(process.cwd(), "src", "auth.ts");

const FORBIDDEN_PATTERNS = [
  { regex: /\bdb\s*\./, label: "uso de `db.` (client Prisma)" },
  { regex: /@prisma\/client/, label: "import de @prisma/client" },
  { regex: /\bPrismaClient\b/, label: "uso de PrismaClient" },
  { regex: /\bprisma\s*\./, label: "uso de `prisma.`" },
];

const GUARDED_CALLBACKS = ["jwt", "session"];

function extractBalancedBlock(source, startIndex) {
  let depth = 0;
  let i = startIndex;
  let blockStart = -1;

  for (; i < source.length; i++) {
    if (source[i] === "{") {
      if (depth === 0) blockStart = i;
      depth++;
    } else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(blockStart, i + 1);
      }
    }
  }
  return null;
}

function findCallbackBody(source, callbackName) {
  const nameRegex = new RegExp(`\\b${callbackName}\\s*\\([^)]*\\)\\s*{`, "m");
  const match = nameRegex.exec(source);
  if (!match) return null;

  const bodyOpenBraceIndex = match.index + match[0].length - 1;
  return extractBalancedBlock(source, bodyOpenBraceIndex);
}

function main() {
  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`[guardrail-prisma-edge] Arquivo nao encontrado: ${TARGET_FILE}`);
    process.exit(1);
  }

  const source = fs.readFileSync(TARGET_FILE, "utf8");

  const callbacksBody = findCallbackBody(source, "callbacks");
  const searchSource = callbacksBody || source;

  const violations = [];

  for (const callbackName of GUARDED_CALLBACKS) {
    const body = findCallbackBody(searchSource, callbackName);
    if (!body) {
      console.warn(
        `[guardrail-prisma-edge] Aviso: callback "${callbackName}" nao encontrado em auth.ts. Pulando checagem.`,
      );
      continue;
    }

    for (const { regex, label } of FORBIDDEN_PATTERNS) {
      if (regex.test(body)) {
        violations.push(`Callback "${callbackName}": ${label}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("\n[guardrail-prisma-edge] BLOQUEADO - Prisma/db detectado em callback Edge-only:\n");
    for (const v of violations) console.error(`  - ${v}`);
    console.error(
      "\nEsses callbacks (jwt/session) rodam em Edge Runtime e Prisma nao e compativel.",
    );
    console.error("Ja causou outage de login em producao. Remova o uso de Prisma/db daqui.\n");
    process.exit(1);
  }

  console.log("[guardrail-prisma-edge] OK - nenhum uso de Prisma/db nos callbacks jwt/session.");
  process.exit(0);
}

main();