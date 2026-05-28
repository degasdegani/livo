export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className="min-h-screen py-16 px-6"
      style={{ backgroundColor: "#050505" }}
    >
      <div className="max-w-3xl mx-auto">
        <a
          href="/"
          className="flex items-center gap-2 mb-12 hover:opacity-70 transition-opacity"
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
            }}
          />
          <span className="font-black text-white" style={{ fontSize: "18px" }}>
            Livo
          </span>
        </a>
        {children}
      </div>
    </main>
  );
}
