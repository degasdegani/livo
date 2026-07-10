"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { log } from "@/lib/logger";
import { SESSION_EXPIRED_ERROR } from "@/lib/terms";
import { recordTermsAcceptance } from "@/lib/terms-record";

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
    return { error: "Você precisa marcar a confirmação para continuar." };
  }

  try {
    await recordTermsAcceptance(userId);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      log.auth.error("Sessão órfã ao aceitar termos: userId não existe mais em users", { userId });
      return { error: SESSION_EXPIRED_ERROR };
    }
    throw err;
  }

  redirect("/dashboard");
}
