import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
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
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: "var(--bg-card-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
            color: "var(--text-tertiary)",
          }}
        >
          {icon}
        </div>
      )}
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 280, margin: 0 }}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            cursor: "pointer",
            border: "none",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
