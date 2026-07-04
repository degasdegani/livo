// src/app/(dashboard)/dashboard/marketing/page.tsx
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasModuleAccess } from "@/lib/modules";
import { requireRole } from "@/lib/permissions";
import { getAniversariantes, getClientesSumidos } from "./actions";
import { MarketingClient } from "./marketing-client";

export const metadata = {
  title: "Marketing & Retenção | LIVO",
};

export default async function MarketingPage() {
  // RBAC: barbers também podem ver (com escopo restrito, tratado nas actions)
  const membership = await requireRole(["owner", "reception", "barber"]);

  // Gate de módulo (navegação): START → upsell.
  if (!(await hasModuleAccess(membership.barbershopId, "marketing"))) {
    redirect("/dashboard/assinar");
  }

  // Busca nome da barbearia para personalizar mensagens WhatsApp
  const barbershop = await db.barbershop.findUnique({
    where: { id: membership.barbershopId },
    select: { name: true },
  });

  const nomeBarberaria = barbershop?.name ?? "nossa barbearia";

  // SSR: carrega dados iniciais em paralelo para não dobrar o tempo de resposta
  const [sumidosIniciais, aniversariantesIniciais] = await Promise.all([
    getClientesSumidos(30),
    getAniversariantes(),
  ]);

  return (
    <MarketingClient
      sumidosIniciais={sumidosIniciais}
      aniversariantesIniciais={aniversariantesIniciais}
      nomeBarberaria={nomeBarberaria}
    />
  );
}
