"use server";

import { submitReview } from "@/lib/reviews-server";

export async function submitReviewAction(
  token: string,
  rating: number,
  comment: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await submitReview(token, rating, comment || null);

  if (result.success) {
    return { success: true };
  }

  const messages: Record<typeof result.reason, string> = {
    invalid: "Este link de avaliação não é válido.",
    used: "Esta avaliação já foi enviada anteriormente.",
    expired: "Este link de avaliação expirou.",
    invalid_rating: "Selecione uma nota de 1 a 5 estrelas.",
  };

  return { success: false, error: messages[result.reason] };
}
