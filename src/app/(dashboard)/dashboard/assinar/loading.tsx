// src/app/(dashboard)/dashboard/assinar/loading.tsx

export default function AssinarLoading() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "inline-block",
            }}
          />
          <span
            className="font-black"
            style={{ fontSize: "20px", color: "var(--text-primary)" }}
          >
            LIVO
          </span>
        </div>
        <div
          className="rounded-full animate-spin"
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "var(--color-primary)",
          }}
        />
      </div>
    </main>
  );
}
