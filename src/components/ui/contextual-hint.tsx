"use client";
import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dismissHint, isHintDismissed } from "@/lib/hints";

type ContextualHintProps = {
  hintKey: string;
  title: string;
  text: string;
};

// Dica contextual (LIVO-047): aparece uma unica vez por usuario/tela, nunca
// bloqueia nenhuma acao, e pode ser dispensada a qualquer momento.
export function ContextualHint({ hintKey, title, text }: ContextualHintProps) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    isHintDismissed(hintKey).then((dismissed) => {
      setVisible(!dismissed);
      setLoaded(true);
    });
  }, [hintKey]);

  function handleDismiss() {
    setVisible(false);
    dismissHint(hintKey);
  }

  if (!loaded || !visible) return null;

  return (
    <div
      role="status"
      className="flex gap-3 rounded-lg p-4 mt-2"
      style={{
        backgroundColor: "var(--bg-card-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <Info size={18} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {text}
        </p>
        <button
          onClick={handleDismiss}
          className="text-sm font-medium mt-2"
          style={{ color: "var(--color-primary)" }}
        >
          Entendi
        </button>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Fechar dica"
        style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
