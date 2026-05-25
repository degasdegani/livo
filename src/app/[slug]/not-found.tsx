export default function BarbershopNotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: "#050505" }}
    >
      <div className="flex items-center gap-2 mb-12">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#FF2D55",
            display: "inline-block",
          }}
        />
        <span className="font-black text-white" style={{ fontSize: "20px" }}>
          Livo
        </span>
      </div>

      <h1
        className="font-black text-white mb-3"
        style={{ fontSize: "48px", letterSpacing: "-2px" }}
      >
        404
      </h1>
      <p className="text-lg mb-2" style={{ color: "#A1A1AA" }}>
        Barbearia não encontrada.
      </p>
      <p className="text-sm mb-8" style={{ color: "#52525B" }}>
        Verifique o endereço ou peça o link correto para a barbearia.
      </p>

      <a
        href="/"
        className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-80"
        style={{ background: "#FF2D55" }}
      >
        Conhecer o Livo
      </a>
    </main>
  );
}
