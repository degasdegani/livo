// ============================================================
// LIVO — Página de Login
// ============================================================

"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { poppins } from "@/lib/fonts";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos.");
        return;
      }

      router.push("/dashboard");
    });
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <div className="mb-8">
        <span
          className={poppins.className}
          style={{
            fontSize: "20px",
            fontWeight: 300,
            letterSpacing: "0.35em",
            color: "#FFFFFF",
          }}
        >
          L I V O
        </span>
      </div>

      <h1
        className="font-black text-white mb-1"
        style={{ fontSize: "24px", letterSpacing: "-0.5px" }}
      >
        Bem-vindo de volta
      </h1>
      <p className="text-sm mb-8" style={{ color: "#52525B" }}>
        Entre na sua conta para acessar o painel.
      </p>

      {/* Botão Google */}
      <Button
        variant="secondary"
        size="lg"
        className="w-full mb-6"
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
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
        Entrar com Google
      </Button>

      {/* Divisor */}
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

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            className="w-full px-4 py-3 rounded-xl text-sm text-white transition-colors outline-none placeholder:text-[#3F3F46]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--livo-cream)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
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
            placeholder="Sua senha"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white transition-colors outline-none placeholder:text-[#3F3F46]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--livo-cream)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          />
          <a
            href="/forgot-password"
            style={{
              fontSize: 13,
              color: "#52525B",
              textDecoration: "none",
              display: "block",
              textAlign: "right",
              marginTop: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#A1A1AA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#52525B";
            }}
          >
            Esqueceu a senha?
          </a>
        </div>

        {error && (
          <p
            className="text-xs text-center py-2 px-3 rounded-lg"
            style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="red"
          size="lg"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-xs mt-6" style={{ color: "#52525B" }}>
        Não tem conta?{" "}
        <a
          href="/cadastro"
          className="hover:text-white transition-colors"
          style={{ color: "#A1A1AA" }}
        >
          Criar conta grátis
        </a>
      </p>
    </div>
  );
}
