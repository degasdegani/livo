const SIZES = { sm: 20, md: 32, lg: 48 } as const;

interface LoadingStateProps {
  label?: string;
  size?: keyof typeof SIZES;
}

export function LoadingState({ label = "Carregando...", size = "md" }: LoadingStateProps) {
  const px = SIZES[size];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
        flexDirection: "column",
      }}
    >
      <style>{`@keyframes livo-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: px,
          height: px,
          border: "2px solid var(--border)",
          borderTop: "2px solid var(--color-primary)",
          borderRadius: "50%",
          animation: "livo-spin 600ms linear infinite",
        }}
      />
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>{label}</p>
    </div>
  );
}
