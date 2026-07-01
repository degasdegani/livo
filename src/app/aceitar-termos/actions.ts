"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { recordTermsAcceptance } from "@/lib/terms-record";

// Grava o aceite para o usuário logado e redireciona. Server Action (Node).
// Sem gate nesta etapa (B2.2): a página é acessível isoladamente; a B2.3 é que
// vai encaminhar usuários pendentes para cá.
export async function acceptTermsAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return { error: "Faça login para aceitar os termos." };
  }
  if (formData.get("accept") !== "on") {
    return {
      error: "Você precisa marcar a confirmação para continuar.",
    };
  }

  await recordTermsAcceptance(userId);

  redirect("/dashboard");
}
