// ============================================================
// LIVO — Central de Permissões (RBAC)
// Resolve o "crachá" da pessoa logada e aplica as regras de acesso
// ============================================================

import type { Prisma } from "@prisma/client";
import { MemberRole, PlanStatus } from "@prisma/client";
import { redirect } from "next/navigation";
// src/lib/permissions.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type MembershipContext = {
  membershipId: string;
  userId: string;
  role: MemberRole;
  barbershopId: string;
  professionalId: string | null;
};

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function getCurrentMembership(): Promise<MembershipContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const membership = await db.membership.findFirst({
    where: { userId, isActive: true },
  });
  if (!membership) return null;

  return {
    membershipId: membership.id,
    userId: membership.userId,
    role: membership.role,
    barbershopId: membership.barbershopId,
    professionalId: membership.professionalId,
  };
}

export async function requireMembership(): Promise<MembershipContext> {
  const m = await getCurrentMembership();
  if (!m) redirect("/login");
  return m;
}

export async function requireRole(
  roles: MemberRole | MemberRole[],
): Promise<MembershipContext> {
  const m = await requireMembership();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(m.role)) {
    redirect("/dashboard");
  }
  return m;
}

// ── Verificação de billing ────────────────────────────────────────────────────

export async function checkBillingAccess(barbershopId: string): Promise<void> {
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { planStatus: true, trialEndsAt: true },
  });

  if (!barbershop) redirect("/login");

  // Lifetime — nunca bloqueia
  if (barbershop.planStatus === PlanStatus.lifetime) return;

  // Assinatura ativa — deixa passar
  if (barbershop.planStatus === PlanStatus.active) return;

  // Trial — verifica se ainda está válido
  if (barbershop.planStatus === PlanStatus.trial) {
    if (!barbershop.trialEndsAt) return; // sem data = trial indefinido
    if (new Date() < new Date(barbershop.trialEndsAt)) return; // ainda no prazo
  }

  // Trial expirado → tela de assinatura
  if (barbershop.planStatus === PlanStatus.trial) {
    redirect("/dashboard/assinar");
  }

  // Suspenso ou cancelado → tela de recuperação financeira
  if (
    barbershop.planStatus === PlanStatus.suspended ||
    barbershop.planStatus === PlanStatus.cancelled
  ) {
    redirect("/dashboard/suspenso");
  }

  // Fallback para qualquer estado desconhecido
  redirect("/dashboard/assinar");
}

export async function requireMembershipWithBilling(): Promise<MembershipContext> {
  const m = await requireMembership();
  // Apenas owners são verificados — membros convidados seguem o billing da barbearia
  if (m.role === MemberRole.owner) {
    await checkBillingAccess(m.barbershopId);
  }
  return m;
}

// ── Helpers de papel ──────────────────────────────────────────────────────────

export function isOwner(m: MembershipContext) {
  return m.role === "owner";
}

export function canSeeAllClients(m: MembershipContext) {
  return m.role === "owner" || m.role === "reception";
}

export function clientScope(m: MembershipContext): Prisma.ClientWhereInput {
  if (canSeeAllClients(m)) {
    return { barbershopId: m.barbershopId };
  }
  return {
    barbershopId: m.barbershopId,
    appointments: { some: { professionalId: m.professionalId ?? "__none__" } },
  };
}

export function appointmentScope(
  m: MembershipContext,
): Prisma.AppointmentWhereInput {
  if (canSeeAllClients(m)) {
    return { barbershopId: m.barbershopId };
  }
  return {
    barbershopId: m.barbershopId,
    professionalId: m.professionalId ?? "__none__",
  };
}
