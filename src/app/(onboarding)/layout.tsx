// ============================================================
// LIVO — Onboarding Layout
// Layout centralizado para o formulário de cadastro da barbearia
// ============================================================

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/permissions";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Não logado → login
  if (!session?.user?.id) redirect("/login");

  // Já tem membership (owner, barber ou reception) → pula o onboarding
  const membership = await getCurrentMembership();
  if (membership) redirect("/dashboard");

  return (
    <main
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: "#050505" }}
    >
      {/* Grid de fundo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 20%, black 30%, transparent 80%)",
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto">{children}</div>
    </main>
  );
}
