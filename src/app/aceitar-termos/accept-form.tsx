"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { acceptTermsAction } from "./actions";
import { SESSION_EXPIRED_ERROR } from "@/lib/terms";

function SubmitButton({ termsAccepted }: { termsAccepted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !termsAccepted}
      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
      style={{ background: "#FF2D55", boxShadow: "0 8px 24px rgba(255,45,85,0.3)" }}
    >
      {pending ? "Confirmando..." : "Li e aceito, continuar"}
    </button>
  );
}

export function AcceptForm() {
  const [state, action] = useActionState(acceptTermsAction, null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label
        className="flex items-start gap-2.5 text-sm"
        style={{ color: "#A1A1AA", lineHeight: 1.5 }}
      >
        <input
          name="accept"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
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
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-xs text-center py-2 px-3 rounded-lg"
            style={{ color: "#FF2D55", background: "rgba(255,45,85,0.08)" }}
          >
            {state.error}
          </p>
          {state.error === SESSION_EXPIRED_ERROR && (
            <Link
              href="/login"
              className="text-xs hover:underline"
              style={{ color: "#FF2D55" }}
            >
              Ir para o login
            </Link>
          )}
        </div>
      )}

      <SubmitButton termsAccepted={termsAccepted} />
    </form>
  );
}
