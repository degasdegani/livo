import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Tente novamente em instantes.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <AlertCircle size={32} style={{ color: "var(--status-red)" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
        {title}
      </p>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            backgroundColor: "var(--bg-card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
