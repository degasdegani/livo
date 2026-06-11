function CardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 animate-pulse"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--border)",
      }}
    >
      <div className="flex gap-2 mb-3">
        <div
          className="h-5 w-16 rounded-full"
          style={{ backgroundColor: "var(--border)" }}
        />
        <div
          className="h-5 w-12 rounded-full"
          style={{ backgroundColor: "var(--border)" }}
        />
        <div
          className="h-5 w-14 rounded-full"
          style={{ backgroundColor: "var(--border)" }}
        />
      </div>
      <div
        className="h-4 w-full rounded mb-2"
        style={{ backgroundColor: "var(--border)" }}
      />
      <div
        className="h-4 w-4/5 rounded mb-3"
        style={{ backgroundColor: "var(--border)" }}
      />
      <div
        className="h-3 w-32 rounded"
        style={{ backgroundColor: "var(--border)" }}
      />
    </div>
  );
}

export default function InsightsLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Back link skeleton */}
        <div
          className="h-4 w-20 rounded animate-pulse"
          style={{ backgroundColor: "var(--border)" }}
        />

        {/* Summary card skeleton */}
        <div
          className="rounded-2xl p-6 animate-pulse"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="h-6 w-48 rounded mb-3"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-4 w-72 rounded mb-4"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div className="flex gap-2">
            <div
              className="h-6 w-20 rounded-full"
              style={{ backgroundColor: "var(--border)" }}
            />
            <div
              className="h-6 w-20 rounded-full"
              style={{ backgroundColor: "var(--border)" }}
            />
            <div
              className="h-6 w-20 rounded-full"
              style={{ backgroundColor: "var(--border)" }}
            />
          </div>
        </div>

        {/* Seção 1 — VIP skeleton (2 cards) */}
        <div className="flex flex-col gap-3">
          <div
            className="h-3 w-40 rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Seção 2 — Reativação skeleton (3 cards) */}
        <div className="flex flex-col gap-3">
          <div
            className="h-3 w-48 rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Seção 3 — Otimização skeleton (1 card) */}
        <div className="flex flex-col gap-3">
          <div
            className="h-3 w-56 rounded animate-pulse"
            style={{ backgroundColor: "var(--border)" }}
          />
          <CardSkeleton />
        </div>
      </main>
    </div>
  );
}
