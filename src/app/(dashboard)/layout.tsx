// src/app/(dashboard)/layout.tsx
import { requireMembership } from "@/lib/permissions";
import { requireTermsAccepted } from "@/lib/terms-gate";
import { db } from "@/lib/db";
import { isClubEnabled } from "@/lib/clube-flag";
import { accessibleModulesFor } from "@/lib/modules";
import { getTodayAppointmentsForAlerts } from "./dashboard/agenda/agenda-actions";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate de aceite de termos: ANTES de membership/billing. Não interfere no
  // caso não-logado (o helper retorna e requireMembership cuida do /login).
  await requireTermsAccepted();

  const membership = await requireMembership();

  const [barbershop, alerts, clubEnabled] = await Promise.all([
    db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      // Campos de plano alargam o MESMO findUnique (zero query extra) para
      // computar os módulos liberados que alimentam o nav (UX).
      select: {
        name: true,
        plan: true,
        planStatus: true,
        moduleAddOns: true,
      },
    }),
    getTodayAppointmentsForAlerts(),
    isClubEnabled(membership.barbershopId),
  ]);

  // Módulos liberados (nav/UX only — a segurança real é o gate por página/action).
  const allowedModules = barbershop
    ? Array.from(accessibleModulesFor(barbershop))
    : [];

  return (
    <DashboardLayoutClient
      role={membership.role}
      barbershopId={membership.barbershopId}
      barbershopName={barbershop?.name ?? ""}
      alerts={alerts}
      clubEnabled={clubEnabled}
      allowedModules={allowedModules}
    >
      {children}
    </DashboardLayoutClient>
  );
}
