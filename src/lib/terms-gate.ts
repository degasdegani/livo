import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TERMS_DOCUMENT_TYPE, isTermsGateBlocked } from "@/lib/terms";

// Gate de aceite de termos. Roda em Node (layouts do dashboard e do onboarding),
// NUNCA no middleware (Edge) — a consulta a TermsAcceptance exige Prisma.
// Encaminha usuário logado com aceite pendente para /aceitar-termos, ANTES do
// fluxo de membership/billing. Não-logado é ignorado aqui (o fluxo normal cuida
// do /login). A isenção da TX é estrutural (planStatus lifetime), não por id.
//
// Sem risco de loop: /aceitar-termos e as páginas legais (/termos, /privacidade)
// vivem FORA das árvores (dashboard)/(onboarding), então nunca executam este gate.
export async function requireTermsAccepted(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return;

  // planStatus da barbearia do usuário (owner OU staff), para a isenção lifetime.
  // Usuário novo sem membership → planStatus null → não é TX → gate normal.
  const membership = await db.membership.findFirst({
    where: { userId, isActive: true },
    select: { barbershopId: true },
  });

  let planStatus = null;
  if (membership) {
    const barbershop = await db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      select: { planStatus: true },
    });
    planStatus = barbershop?.planStatus ?? null;
  }

  const last = await db.termsAcceptance.findFirst({
    where: { userId, documentType: TERMS_DOCUMENT_TYPE },
    orderBy: { acceptedAt: "desc" },
    select: { version: true },
  });

  if (
    isTermsGateBlocked({
      planStatus,
      lastAcceptedVersion: last?.version ?? null,
    })
  ) {
    redirect("/aceitar-termos");
  }
}
