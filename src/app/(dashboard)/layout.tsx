// ============================================================
// LIVO — Dashboard Layout
// Verifica autenticação E se o usuário tem barbearia
// Se não tiver barbearia → onboarding
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verifica se está logado
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 2. Verifica se tem barbearia cadastrada
  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
  });

  // 3. Sem barbearia → vai para o onboarding
  if (!barbershop) redirect("/onboarding");

  // 4. Tudo certo → renderiza o dashboard
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {children}
    </div>
  );
}
