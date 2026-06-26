// src/app/(dashboard)/layout.tsx
import { headers } from "next/headers";
import { checkBillingAccess, requireMembership } from "@/lib/permissions";
import { db } from "@/lib/db";
import { isClubEnabled } from "@/lib/clube-flag";
import { getTodayAppointmentsForAlerts } from "./dashboard/agenda/agenda-actions";
import { DashboardLayoutClient } from "./dashboard-layout-client";

// Rotas que não devem ser bloqueadas pelo billing check
// (são as próprias telas de resolução de billing)
const BILLING_EXEMPT = ["/dashboard/assinar", "/dashboard/suspenso"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await requireMembership();

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isBillingExempt = BILLING_EXEMPT.some((p) => pathname.startsWith(p));

  if (!isBillingExempt) {
    await checkBillingAccess(membership.barbershopId);
  }

  const [barbershop, alerts, clubEnabled] = await Promise.all([
    db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      select: { name: true },
    }),
    getTodayAppointmentsForAlerts(),
    isClubEnabled(membership.barbershopId),
  ]);

  return (
    <DashboardLayoutClient
      role={membership.role}
      barbershopId={membership.barbershopId}
      barbershopName={barbershop?.name ?? ""}
      alerts={alerts}
      clubEnabled={clubEnabled}
    >
      {children}
    </DashboardLayoutClient>
  );
}
