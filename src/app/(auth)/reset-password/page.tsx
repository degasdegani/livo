"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "./actions";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(token, password);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (!token) {
    return (
      <div>
        <h1
          className="font-black text-white mb-2"
          style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
        >
          Link inválido
        </h1>
        <p className="text-sm mb-6" style={{ color: "#52525B", lineHeight: 1.6 }}>
          Este link de redefinição é inválido.
        </p>
        <a
          href="/forgot-password"
          className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all duration-200 hover:opacity-90"
          style={{
            background: "#FF2D55",
            boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
          }}
        >
          Solicitar novo link
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <div
          className="flex items-center justify-center w-12 h-12 rounded-2xl mb-6"
          style={{ background: "rgba(255,45,85,0.1)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17L4 12"
              stroke="#FF2D55"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1
          className="font-black text-white mb-2"
          style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
        >
          Senha redefinida!
        </h1>
        <p className="text-sm mb-6" style={{ color: "#52525B", lineHeight: 1.6 }}>
          Sua senha foi atualizada com sucesso. Você já pode fazer login com a
          nova senha.
        </p>
        <a
          href="/login"
          className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all duration-200 hover:opacity-90"
          style={{
            background: "#FF2D55",
            boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
          }}
        >
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <>
      <h1
        className="font-black text-white mb-1"
        style={{ fontSize: "24px", letterSpacing: "-0.5px" }}
      >
        Nova senha
      </h1>
      <p className="text-sm mb-8" style={{ color: "#52525B" }}>
        Escolha uma senha forte com pelo menos 8 caracteres.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "#A1A1AA" }}
          >
            Nova senha
          </label>
          <input
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            disabled={isPending}
            className="w-full px-4 py-3 rounded-xl text-sm text-white transition-colors outline-none placeholder:text-[#3F3F46] disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#FF2D55";
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
            Confirmar nova senha
          </label>
          <input
            name="confirm"
            type="password"
            placeholder="Repita a senha"
            required
            minLength={8}
            disabled={isPending}
            className="w-full px-4 py-3 rounded-xl text-sm text-white transition-colors outline-none placeholder:text-[#3F3F46] disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#FF2D55";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          />
        </div>

        {error && (
          <p
            className="text-xs text-center py-2 px-3 rounded-lg"
            style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
          style={{
            background: "#FF2D55",
            boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
          }}
        >
          {isPending ? "Salvando..." : "Redefinir senha"}
        </button>
      </form>

      <p className="text-center text-xs mt-6" style={{ color: "#52525B" }}>
        Link expirou?{" "}
        <a
          href="/forgot-password"
          className="hover:text-white transition-colors"
          style={{ color: "#A1A1AA" }}
        >
          Solicitar novo link
        </a>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
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

      <Suspense
        fallback={
          <div style={{ color: "#52525B", fontSize: 14 }}>Carregando...</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
