"use client";

import { signIn } from "next-auth/react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerUser } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
      style={{
        background: "#FF2D55",
        boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
      }}
    >
      {pending ? "Criando conta..." : "Criar conta gratis"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, action] = useActionState(registerUser, null);

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "#0A0A0A",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-8">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#FF2D55",
            display: "inline-block",
            boxShadow: "0 0 12px rgba(255,45,85,0.6)",
          }}
        />
        <span
          className="font-black text-white"
          style={{ fontSize: "20px", letterSpacing: "-0.5px" }}
        >
          Livo
        </span>
      </div>

      <h1
        className="font-black text-white mb-1"
        style={{ fontSize: "24px", letterSpacing: "-0.5px" }}
      >
        Criar sua conta
      </h1>
      <p className="text-sm mb-8" style={{ color: "#52525B" }}>
        30 dias gratis. Sem cartao de credito.
      </p>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-80 mb-6"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <span className="text-xs" style={{ color: "#3F3F46" }}>
          ou com e-mail
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Nome completo
          </label>
          <input
            name="name"
            type="text"
            placeholder="Joao Silva"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            E-mail
          </label>
          <input
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Senha
          </label>
          <input
            name="password"
            type="password"
            placeholder="Minimo 6 caracteres"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Confirmar senha
          </label>
          <input
            name="confirm"
            type="password"
            placeholder="Repita a senha"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </div>

        <label
          className="flex items-start gap-2.5 text-xs"
          style={{ color: "#A1A1AA", lineHeight: 1.5 }}
        >
          <input
            name="acceptTerms"
            type="checkbox"
            className="mt-0.5 shrink-0"
            style={{ accentColor: "#FF2D55" }}
          />
          <span>
            Li e aceito os{" "}
            <a
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#FF2D55" }}
            >
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#FF2D55" }}
            >
              Política de Privacidade
            </a>
            .
          </span>
        </label>

        {state?.error && (
          <p
            className="text-xs text-center py-2 px-3 rounded-lg"
            style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
          >
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-xs mt-6" style={{ color: "#52525B" }}>
        Ja tem conta?{" "}
        <a href="/login" style={{ color: "#A1A1AA" }}>
          Fazer login
        </a>
      </p>
    </div>
  );
}
