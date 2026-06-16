"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

const VARIANT_COLORS = {
  primary: "var(--color-primary)",
  danger: "var(--status-red)",
  success: "var(--status-green)",
} as const;

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: {
    cancel?: { label?: string; onClick?: () => void };
    confirm?: {
      label: string;
      onClick: () => void;
      loading?: boolean;
      loadingLabel?: string;
      variant?: "primary" | "danger" | "success";
      disabled?: boolean;
    };
  };
  width?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width,
}: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);

  // ESC fecha o drawer
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Foco automático no painel ao abrir
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // Scroll lock no body
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {open && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop fecha o drawer ao clicar fora
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0"
          style={{
            zIndex: 40,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(2px)",
          }}
          onClick={onClose}
        />
      )}

      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed right-0 top-0 h-full flex flex-col outline-none"
        style={{
          width: width ?? "min(420px, 100vw)",
          zIndex: 50,
          backgroundColor: "var(--bg-sidebar)",
          borderLeft: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between flex-shrink-0"
          style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2
              id="drawer-title"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                  marginBottom: 0,
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)", padding: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
          {children}
        </div>

        {/* Footer (opcional) */}
        {footer && (
          <div
            className="flex gap-3 flex-shrink-0"
            style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}
          >
            {footer.cancel && (
              <button
                type="button"
                onClick={footer.cancel.onClick ?? onClose}
                className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--bg-card-elevated)",
                }}
              >
                {footer.cancel.label ?? "Cancelar"}
              </button>
            )}
            {footer.confirm && (
              <button
                type="button"
                onClick={footer.confirm.onClick}
                disabled={footer.confirm.loading || footer.confirm.disabled}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{
                  backgroundColor:
                    VARIANT_COLORS[footer.confirm.variant ?? "primary"],
                }}
              >
                {footer.confirm.loading
                  ? (footer.confirm.loadingLabel ?? footer.confirm.label)
                  : footer.confirm.label}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
