"use client";

// Global error boundary — replaces the root layout when an unrecoverable
// error occurs. Must include <html> and <body> since layout is replaced.
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0B0B0D",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "2px",
                }}
              >
                LI<span style={{ color: "#C8102E" }}>VO</span>
              </span>
            </div>

            <AlertTriangle style={{ width: 48, height: 48, marginBottom: 24, color: "#C8102E" }} />

            <h1
              style={{
                color: "#fff",
                fontSize: "22px",
                fontWeight: 700,
                marginBottom: "12px",
              }}
            >
              Algo deu errado
            </h1>
            <p
              style={{
                color: "#9A9AA6",
                fontSize: "14px",
                marginBottom: "32px",
                lineHeight: 1.6,
              }}
            >
              Ocorreu um erro inesperado. Nossa equipe já foi notificada
              automaticamente.
            </p>

            {error.digest && (
              <p
                style={{
                  color: "#6E6E78",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  marginBottom: "24px",
                }}
              >
                Código: {error.digest}
              </p>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  backgroundColor: "#C8102E",
                  color: "#fff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Tentar novamente
              </button>
              <a
                href="/dashboard"
                style={{
                  backgroundColor: "#17171C",
                  color: "#9A9AA6",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  border: "1px solid #2A2A33",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Ir ao início
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
