"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "#0A0A0A",
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

      {success ? (
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
            E-mail enviado
          </h1>
          <p className="text-sm mb-6" style={{ color: "#52525B", lineHeight: 1.6 }}>
            Se esse e-mail estiver cadastrado no LIVO, você receberá um link para
            redefinir sua senha em breve. Verifique também sua caixa de spam.
          </p>
          <a
            href="/login"
            className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all duration-200 hover:opacity-90"
            style={{
              background: "#FF2D55",
              boxShadow: "0 8px 24px rgba(255,45,85,0.3)",
            }}
          >
            Voltar ao login
          </a>
        </div>
      ) : (
        <>
          <h1
            className="font-black text-white mb-1"
            style={{ fontSize: "24px", letterSpacing: "-0.5px" }}
          >
            Esqueceu sua senha?
          </h1>
          <p className="text-sm mb-8" style={{ color: "#52525B" }}>
            Informe seu e-mail e enviaremos um link de redefinição.
          </p>

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
              {isPending ? "Enviando..." : "Enviar link de redefinição"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "#52525B" }}>
            Lembrou a senha?{" "}
            <a
              href="/login"
              className="hover:text-white transition-colors"
              style={{ color: "#A1A1AA" }}
            >
              Voltar ao login
            </a>
          </p>
        </>
      )}
    </div>
  );
}
