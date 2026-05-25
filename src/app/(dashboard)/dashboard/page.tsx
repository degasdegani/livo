// ============================================================
// LIVO — Dashboard (versão mínima para validar o login)
// Substituiremos isso pelo dashboard real nos próximos dias
// ============================================================

import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ backgroundColor: "#050505" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#FF2D55",
            display: "inline-block",
            boxShadow: "0 0 16px rgba(255,45,85,0.6)",
          }}
        />
        <span
          className="font-black text-white"
          style={{ fontSize: "24px", letterSpacing: "-0.5px" }}
        >
          Livo
        </span>
      </div>

      {/* Mensagem de boas-vindas */}
      <div
        className="text-center rounded-2xl p-8"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.08)",
          maxWidth: "400px",
        }}
      >
        <div className="text-4xl mb-4">✅</div>
        <h1
          className="font-black text-white mb-2"
          style={{ fontSize: "24px", letterSpacing: "-0.5px" }}
        >
          Login funcionando!
        </h1>
        <p className="text-sm mb-6" style={{ color: "#A1A1AA" }}>
          Bem-vindo ao Livo,{" "}
          <strong style={{ color: "#FFFFFF" }}>
            {session?.user?.name ?? session?.user?.email}
          </strong>
          !
        </p>
        <p className="text-xs mb-8" style={{ color: "#52525B" }}>
          O dashboard completo vem nos proximos dias. Hoje validamos que a
          autenticacao funciona 100%.
        </p>

        {/* Botão de logout */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#A1A1AA",
            }}
          >
            Sair da conta
          </button>
        </form>
      </div>

      {/* Info da sessão (para debug) */}
      <div
        className="text-center rounded-xl p-4"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <p
          className="text-xs mb-2"
          style={{ color: "#3F3F46", fontFamily: "var(--font-mono)" }}
        >
          SESSAO ATIVA
        </p>
        <p
          className="text-xs"
          style={{ color: "#52525B", fontFamily: "var(--font-mono)" }}
        >
          {session?.user?.email}
        </p>
        <p
          className="text-xs"
          style={{ color: "#52525B", fontFamily: "var(--font-mono)" }}
        >
          ID: {session?.user?.id}
        </p>
      </div>
    </div>
  );
}
