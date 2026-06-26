"use client";

type Subscription = {
  id: string;
  status: string;
  startedAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  soldByName: string | null;
  periodStart: Date;
  periodEnd: Date;
  client: { name: string; phone: string };
  plan: {
    name: string;
    priceInCents: number;
    items: { serviceId: string; quantityPerCycle: number }[];
  };
  usages: { serviceId: string; usedCount: number }[];
};

type Data = {
  subscriptions: Subscription[];
  mrr: number;
  activeCount: number;
  cancelledCount: number;
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function statusLabel(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "active":
      return { label: "Ativo", color: "#3FB950", bg: "#3FB95022" };
    case "suspended":
      return { label: "Suspenso", color: "#D4A72C", bg: "#D4A72C22" };
    case "cancelled":
      return { label: "Cancelado", color: "#9A9AA6", bg: "#9A9AA622" };
    default:
      return { label: "Pendente", color: "#9A9AA6", bg: "#9A9AA622" };
  }
}

export function AssinantesClient({ data }: { data: Data }) {
  const { subscriptions, mrr, activeCount, cancelledCount } = data;

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "20px",
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ color: "var(--text-primary)", fontSize: "22px", fontWeight: 700, margin: 0 }}>
          Assinantes do Clube
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
          Gerencie os clientes que assinaram um plano do clube.
        </p>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
        <div style={cardStyle}>
          <p style={{ color: "var(--text-tertiary)", fontSize: "12px", marginBottom: "6px" }}>
            MRR
          </p>
          <p style={{ color: "#C8A24C", fontSize: "24px", fontWeight: 700, margin: 0 }}>
            {formatBRL(mrr)}
          </p>
          <p style={{ color: "var(--text-tertiary)", fontSize: "11px", marginTop: "4px" }}>
            receita recorrente mensal
          </p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "var(--text-tertiary)", fontSize: "12px", marginBottom: "6px" }}>
            Assinantes ativos
          </p>
          <p style={{ color: "#3FB950", fontSize: "24px", fontWeight: 700, margin: 0 }}>
            {activeCount}
          </p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: "var(--text-tertiary)", fontSize: "12px", marginBottom: "6px" }}>
            Cancelamentos
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "24px", fontWeight: 700, margin: 0 }}>
            {cancelledCount}
          </p>
        </div>
      </div>

      {/* Tabela */}
      {subscriptions.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
            Nenhum assinante ainda.
          </p>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Cliente", "Plano", "Status", "Uso do ciclo", "Proximo ciclo", "Quem vendeu", "Desde"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        color: "var(--text-tertiary)",
                        fontWeight: 500,
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => {
                  const st = statusLabel(s.status);
                  const usageMap = new Map(s.usages.map((u) => [u.serviceId, u.usedCount]));
                  const totalUsed = s.plan.items.reduce(
                    (acc, item) => acc + (usageMap.get(item.serviceId) ?? 0),
                    0
                  );
                  const totalQuota = s.plan.items.reduce(
                    (acc, item) => acc + item.quantityPerCycle,
                    0
                  );

                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "12px" }}>
                        <p style={{ color: "var(--text-primary)", margin: 0, fontWeight: 500 }}>
                          {s.client.name}
                        </p>
                        <p style={{ color: "var(--text-tertiary)", margin: 0, fontSize: "12px" }}>
                          {s.client.phone}
                        </p>
                      </td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                        {s.plan.name}
                        <p style={{ color: "var(--text-tertiary)", margin: "2px 0 0", fontSize: "12px" }}>
                          {formatBRL(s.plan.priceInCents)}/mes
                        </p>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          background: st.bg,
                          color: st.color,
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <p style={{ color: "var(--text-primary)", margin: 0 }}>
                          {totalUsed}/{totalQuota}
                        </p>
                        <div style={{
                          marginTop: "4px",
                          background: "var(--bg-card-elevated)",
                          borderRadius: "4px",
                          height: "4px",
                          width: "80px",
                        }}>
                          <div style={{
                            background: totalUsed >= totalQuota ? "#C8102E" : "#C8A24C",
                            borderRadius: "4px",
                            height: "4px",
                            width: `${totalQuota > 0 ? Math.min(100, (totalUsed / totalQuota) * 100) : 0}%`,
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                        {s.status === "cancelled"
                          ? `Acesso ate ${formatDate(s.currentPeriodEnd)}`
                          : formatDate(s.currentPeriodEnd)}
                      </td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                        {s.soldByName ?? "—"}
                      </td>
                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                        {formatDate(s.startedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
