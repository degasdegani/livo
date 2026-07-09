/**
 * Guardrail: bloqueia emoji de risco em src/**\/*.ts e *.tsx.
 * Emoji cru (especialmente astral/variation-selector) ja causou corrupcao de
 * encoding no Windows (LIVO-027). Icones de UI devem usar lucide-react;
 * mensagens para o cliente (WhatsApp/e-mail) devem usar escape \u{XXXX}.
 *
 * Uma pequena allowlist de codepoints BMP (dingbats de UI intencionais, sem
 * variation selector) e permitida: ✓ ✕ ✦ ✉ ⚠.
 *
 * Uso: node scripts/guardrail-emoji.js
 * Exit 0 = OK. Exit 1 = emoji de risco encontrado (bloqueia o processo que chamou).
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(process.cwd(), "src");

const EMOJI_RANGES = [
  [0x1f300, 0x1faff],
  [0x2600, 0x27bf],
  [0x1f1e6, 0x1f1ff],
];

const ALLOWED_CODEPOINTS = new Set([0x2713, 0x2715, 0x2726, 0x2709, 0x26a0]);

const VARIATION_SELECTOR = 0xfe0f;

function isRiskyCodepoint(cp) {
  if (cp > 0xffff) return true;
  if (cp === VARIATION_SELECTOR) return true;
  for (const [lo, hi] of EMOJI_RANGES) {
    if (cp >= lo && cp <= hi && !ALLOWED_CODEPOINTS.has(cp)) return true;
  }
  return false;
}

function walk(dir, violations) {
  for (const f of fs.readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(f)) continue;
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p, violations);
    } else if (/\.(ts|tsx)$/.test(f)) {
      const content = fs.readFileSync(p, "utf8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const ch of line) {
          const cp = ch.codePointAt(0);
          if (isRiskyCodepoint(cp)) {
            violations.push({ file: p, lineNumber: i + 1, ch, cp });
          }
        }
      });
    }
  }
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log("[guardrail-emoji] OK - diretorio src nao encontrado, nada a verificar.");
    process.exit(0);
  }

  const violations = [];
  walk(SRC_DIR, violations);

  if (violations.length > 0) {
    console.error("\n[guardrail-emoji] BLOQUEADO - emoji de risco encontrado:\n");
    for (const v of violations) {
      console.error(
        `  - ${path.relative(process.cwd(), v.file)}:${v.lineNumber} "${v.ch}" (U+${v.cp.toString(16).toUpperCase()})`,
      );
    }
    console.error(
      "\nUse icone lucide-react para UI ou escape \\u{XXXX} para texto enviado ao cliente (WhatsApp/e-mail).\n",
    );
    process.exit(1);
  }

  console.log("[guardrail-emoji] OK - nenhum emoji de risco encontrado em src/**/*.ts(x).");
  process.exit(0);
}

main();
