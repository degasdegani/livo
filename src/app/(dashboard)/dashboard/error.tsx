"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md text-center">
        <AlertTriangle size={48} style={{ color: "var(--status-red)" }} className="mb-6" />

        <h1
          className="font-bold text-xl mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Algo deu errado
        </h1>

        <p
          className="text-sm mb-2"
          style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
        >
          Ocorreu um erro inesperado. Nossa equipe já foi notificada
          automaticamente.
        </p>

        {error.digest && (
          <p
            className="text-xs font-mono mb-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            Código: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            Ir ao início
          </a>
        </div>
      </div>
    </div>
  );
}
