"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Programa Embaixadores (A5): seção read-only de indicação. Exibe o link
// próprio da barbearia (com botão copiar), o saldo de meses grátis e um selo
// "Embaixador Livo" quando isEmbaixador=true. NÃO oferece resgate do crédito
// (Fase 2/manual) — apenas exibe.
interface ReferralSectionProps {
  referralLink: string;
  referralCode: string;
  isEmbaixador: boolean;
  freeMonthCredits: number;
}

export function ReferralSection({
  referralLink,
  referralCode,
  isEmbaixador,
  freeMonthCredits,
}: ReferralSectionProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Fallback para navegadores sem Clipboard API disponível.
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      className="p-5 rounded-xl flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="text-sm font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Indique e ganhe
        </h2>
        {isEmbaixador && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              color: "var(--color-gold)",
              backgroundColor: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.35)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-gold)",
                display: "inline-block",
              }}
            />
            Embaixador Livo
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Cada amigo que assinar e pagar a primeira mensalidade te dá 1 mês grátis.
        Compartilhe seu link:
      </p>

      {/* Link + copiar — mesmo padrão do "Copiar link" de Pacotes */}
      <div
        className="flex items-center gap-2 p-2 rounded-lg"
        style={{
          backgroundColor: "var(--bg-card-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="flex-1 min-w-0 truncate text-sm px-1"
          style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}
          title={referralLink}
        >
          {referralLink}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
          style={{
            backgroundColor: copied ? "var(--status-green)" : "transparent",
            color: copied ? "#fff" : "var(--text-secondary)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        Código: <span style={{ fontFamily: "monospace" }}>{referralCode}</span>
      </p>

      {/* Saldo de meses grátis (somente exibição) */}
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{
          backgroundColor: "var(--bg-card-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          Meses grátis disponíveis
        </span>
        <span
          className="text-lg font-black"
          style={{
            color:
              freeMonthCredits > 0 ? "var(--status-green)" : "var(--text-tertiary)",
          }}
        >
          {freeMonthCredits}
        </span>
      </div>
    </section>
  );
}
