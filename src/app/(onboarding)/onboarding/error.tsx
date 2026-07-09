"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-(--bg-base) flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md text-center">
        <div className="text-center mb-8">
          <span className="text-2xl font-black tracking-widest">
            <span style={{ color: "#fff" }}>LI</span>
            <span style={{ color: "#C8102E" }}>VO</span>
          </span>
        </div>

        <AlertTriangle className="mx-auto mb-6" size={36} style={{ color: "#C8102E" }} />

        <h1 className="text-white font-bold text-xl mb-3">
          Algo deu errado
        </h1>

        <p
          className="text-sm mb-4"
          style={{ color: "#9A9AA6", lineHeight: 1.6 }}
        >
          Ocorreu um erro inesperado durante o cadastro. Nossa equipe foi
          notificada e seus dados não foram perdidos. Tente novamente; se o
          problema persistir, fale com o suporte.
        </p>

        <a
          href="mailto:contato@livobarber.com.br"
          className="inline-block text-sm mb-8 underline"
          style={{ color: "#9A9AA6" }}
        >
          contato@livobarber.com.br
        </a>

        {error.digest && (
          <p className="text-xs font-mono mb-6" style={{ color: "#6E6E78" }}>
            Código: {error.digest}
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
          style={{ background: "#C8102E" }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
