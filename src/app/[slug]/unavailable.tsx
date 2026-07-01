// Tela neutra exibida a visitantes quando a página pública está indisponível.
// NÃO expõe o motivo interno (confirmação de e-mail do dono) ao público externo.
export function PublicUnavailable() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "#050505" }}
    >
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
            }}
          />
          <span className="text-xs font-bold" style={{ color: "#52525B" }}>
            livo
          </span>
        </div>
        <h1
          className="font-black text-white mb-3"
          style={{ fontSize: "22px", letterSpacing: "-0.3px" }}
        >
          Página indisponível
        </h1>
        <p className="text-sm" style={{ color: "#A1A1AA", lineHeight: 1.6 }}>
          Esta página não está disponível no momento. Tente novamente mais tarde.
        </p>
      </div>
    </main>
  );
}
