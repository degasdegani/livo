// src/app/(dashboard)/layout.tsx
import { requireMembership } from "@/lib/permissions";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await requireMembership();

  return (
    <DashboardLayoutClient
      role={membership.role}
      barbershopId={membership.barbershopId}
    >
      {children}
    </DashboardLayoutClient>
  );
}
