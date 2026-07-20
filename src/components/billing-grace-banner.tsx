import Link from "next/link";

export function BillingGraceBanner({ graceEndsAt }: { graceEndsAt: Date }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((graceEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div
      style={{
        background: "var(--warning, #FFB547)",
        color: "#0B0B0D",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontSize: "14px",
        fontWeight: 600,
        flexWrap: "wrap",
        textAlign: "center",
      }}
    >
      <span>
        Sua fatura venceu. Regularize em até {daysLeft}{" "}
        {daysLeft === 1 ? "dia" : "dias"} para evitar o bloqueio do acesso.
      </span>
      <Link
        href="/dashboard/faturamento"
        style={{
          textDecoration: "underline",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        Regularizar agora
      </Link>
    </div>
  );
}
