// src/components/ui/badge.tsx

type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "gold"
  | "neutral";

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    backgroundColor: "rgba(0,212,160,0.15)",
    color: "var(--status-green)",
    border: "1px solid rgba(0,212,160,0.3)",
  },
  warning: {
    backgroundColor: "rgba(212,167,44,0.15)",
    color: "var(--status-yellow)",
    border: "1px solid rgba(212,167,44,0.3)",
  },
  error: {
    backgroundColor: "var(--color-primary-10)",
    color: "var(--status-red)",
    border: "1px solid var(--color-primary-20)",
  },
  info: {
    backgroundColor: "rgba(154,154,166,0.15)",
    color: "var(--text-secondary)",
    border: "1px solid rgba(154,154,166,0.3)",
  },
  gold: {
    backgroundColor: "rgba(212,175,55,0.15)",
    color: "var(--color-gold)",
    border: "1px solid rgba(212,175,55,0.3)",
  },
  neutral: {
    backgroundColor: "rgba(94,94,104,0.15)",
    color: "var(--text-secondary)",
    border: "1px solid rgba(94,94,104,0.3)",
  },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
