"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { submitProductSuggestion } from "@/lib/product-suggestions";

export function ProductSuggestionButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setMessage("");
  }

  async function handleSubmit() {
    setLoading(true);
    const result = await submitProductSuggestion(message);
    setLoading(false);

    if (result.success) {
      toast("Sugestão enviada, obrigado!", "success");
      setOpen(false);
      setMessage("");
    } else {
      toast(result.error, "error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "2px solid var(--color-primary)",
          color: "var(--color-primary)",
        }}
        aria-label="Sugerir melhoria"
        title="Sugerir melhoria"
      >
        <MessageSquarePlus size={24} />
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Sugerir melhoria"
        description="Conte pra gente o que podemos melhorar no LIVO."
        footer={{
          confirm: {
            label: "Enviar",
            loadingLabel: "Enviando...",
            onClick: handleSubmit,
            loading,
            disabled: message.trim().length < 10,
          },
        }}
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva sua sugestão aqui..."
          disabled={loading}
          rows={5}
          className="w-full rounded-lg p-3 text-sm outline-none resize-none disabled:opacity-50"
          style={{
            backgroundColor: "var(--bg-base)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </Modal>
    </>
  );
}
