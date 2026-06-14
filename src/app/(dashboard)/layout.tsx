// src/app/(dashboard)/layout.tsx
import { headers } from "next/headers";
import { checkBillingAccess, requireMembership } from "@/lib/permissions";
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

  return (
    <DashboardLayoutClient
      role={membership.role}
      barbershopId={membership.barbershopId}
    >
      {children}
    </DashboardLayoutClient>
  );
}
