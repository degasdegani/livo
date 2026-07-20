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
  // Distingue dois casos antes tratados como o mesmo redirect para /login:
  // - sem sessao (nao logado) -> /login
  // - logado porem sem membership (barbearia ainda nao montada) -> /onboarding
  // Antes ambos caiam em /login, gerando loop /dashboard <-> /login para quem
  // estava logado sem barbearia. Roda em Node (le o banco), nunca no Edge.
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const m = await getCurrentMembership();
  if (!m) redirect("/onboarding");
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

export type BillingCheckResult =
  | { status: "ok" }
  | { status: "grace"; graceEndsAt: Date };

const GRACE_PERIOD_DAYS = 3;

export async function checkBillingAccess(
  barbershopId: string,
): Promise<BillingCheckResult> {
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { planStatus: true, trialEndsAt: true, overdueSince: true },
  });

  if (!barbershop) redirect("/login");

  // Lifetime — nunca bloqueia
  if (barbershop.planStatus === PlanStatus.lifetime) return { status: "ok" };

  // Assinatura ativa — deixa passar
  if (barbershop.planStatus === PlanStatus.active) return { status: "ok" };

  // Trial — verifica se ainda está válido
  if (barbershop.planStatus === PlanStatus.trial) {
    if (!barbershop.trialEndsAt) return { status: "ok" }; // sem data = trial indefinido
    if (new Date() < new Date(barbershop.trialEndsAt)) return { status: "ok" }; // ainda no prazo
    // Trial expirado → tela de assinatura, sem carência
    redirect("/dashboard/assinar");
  }

  // Assinatura paga com fatura vencida → carência de 3 dias contados a
  // partir do vencimento real da fatura (overdueSince, vindo do Asaas via
  // payment.dueDate). Sem overdueSince salvo, bloqueia na hora (fallback
  // seguro — sem data confiável, não há carência a calcular).
  if (barbershop.planStatus === PlanStatus.suspended) {
    if (barbershop.overdueSince) {
      const graceEndsAt = new Date(barbershop.overdueSince);
      graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);
      if (new Date() < graceEndsAt) {
        return { status: "grace", graceEndsAt };
      }
    }
    redirect("/dashboard/suspenso");
  }

  // Cancelado → tela de recuperação financeira, sem carência
  if (barbershop.planStatus === PlanStatus.cancelled) {
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
