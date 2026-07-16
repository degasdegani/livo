"use client";

import { useState, useTransition } from "react";
import { submitReviewAction } from "./actions";

export function ReviewForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit() {
    setError("");
    if (rating < 1) {
      setError("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }
    startTransition(async () => {
      const result = await submitReviewAction(token, rating, comment);
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error ?? "Erro ao enviar avaliação.");
      }
    });
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <p className="text-2xl mb-3">⭐</p>
        <p className="text-lg font-bold" style={{ color: "#00D4A0" }}>
          Obrigado pela sua avaliação!
        </p>
        <p className="text-sm mt-2" style={{ color: "#9A9AA6" }}>
          Sua opinião ajuda outros clientes a escolherem o profissional certo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-4xl transition-transform duration-150 hover:scale-110"
            style={{
              color: star <= (hoverRating || rating) ? "#C8A24C" : "#2A2A33",
            }}
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Conte como foi sua experiência (opcional)"
        rows={4}
        maxLength={500}
        className="w-full rounded-xl p-4 text-sm"
        style={{
          background: "#1F1F27",
          border: "1px solid #2A2A33",
          color: "#fff",
          resize: "vertical",
        }}
      />

      {error && (
        <p className="text-sm text-center" style={{ color: "#FF2D55" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all duration-200 hover:opacity-90 disabled:opacity-60"
        style={{
          background: "#C8102E",
          boxShadow: "0 8px 24px rgba(200,16,46,0.3)",
        }}
      >
        {isPending ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
