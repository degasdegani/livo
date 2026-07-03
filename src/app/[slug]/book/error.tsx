"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function BookingError({
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
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-6">⚠️</div>

        <h1 className="text-white font-bold text-xl mb-3">
          Erro no agendamento
        </h1>

        <p
          className="text-sm mb-8"
          style={{ color: "#9A9AA6", lineHeight: 1.6 }}
        >
          Não foi possível carregar a página de agendamento. Tente novamente.
        </p>

        <div className="flex flex-col gap-3">
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
    </div>
  );
}
