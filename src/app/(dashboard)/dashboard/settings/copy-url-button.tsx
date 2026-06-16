"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CopyUrlButtonProps {
  url: string;
}

export function CopyUrlButton({ url }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copiado!" : "Copiar link"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "1px solid var(--border)",
        backgroundColor: copied
          ? "var(--status-green)"
          : "var(--bg-card-elevated)",
        color: copied ? "#fff" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 150ms ease",
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
