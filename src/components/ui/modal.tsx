"use client";

import { type ReactNode, useEffect } from "react";

const SIZES = {
  sm: 448,
  md: 512,
  lg: 640,
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof SIZES;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop fecha modal ao clicar fora
    <div
      role="presentation"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: "var(--z-modal)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full rounded-2xl p-6 space-y-5"
        style={{
          maxWidth: SIZES[size],
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="modal-close-btn"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
