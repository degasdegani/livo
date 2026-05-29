// ============================================================
// LIVO — Dashboard Layout
// Verifica login E se a pessoa tem CRACHÁ (dono, recepção ou barbeiro)
// Sem crachá nenhum → onboarding
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Está logado?
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 2. Tem crachá? (funciona pra dono E pra recepção/barbeiro convidados)
  const membership = await getCurrentMembership();

  // 3. Logado, mas sem crachá nenhum → usuário novo sem barbearia → onboarding
  if (!membership) redirect("/onboarding");

  // 4. Carrega a barbearia DO CRACHÁ (não mais por "dono")
  const barbershop = await db.barbershop.findUnique({
    where: { id: membership.barbershopId },
  });
  if (!barbershop) redirect("/onboarding");

  // 5. Tudo certo → renderiza (visual idêntico ao seu)
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {children}
    </div>
  );
}
