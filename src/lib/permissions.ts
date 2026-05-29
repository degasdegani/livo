// ============================================================
// LIVO — Central de Permissões (RBAC)
// Resolve o "crachá" da pessoa logada e aplica as regras de acesso
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { MemberRole } from "@prisma/client";
import { redirect } from "next/navigation";

// O "contexto" da pessoa logada dentro de uma barbearia
export type MembershipContext = {
  membershipId: string;
  userId: string;
  role: MemberRole;
  barbershopId: string;
  professionalId: string | null;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
};

// Quem está logado (ou null)
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// O CORAÇÃO: pega o crachá ativo da pessoa logada, fresquinho do banco
export async function getCurrentMembership(): Promise<MembershipContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // Por enquanto cada pessoa tem 1 crachá. (Trocar de barbearia vem depois.)
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
    commissionOnServices: membership.commissionOnServices,
    commissionOnProducts: membership.commissionOnProducts,
  };
}

// PORTEIRO: exige crachá. Sem crachá → manda pro login.
export async function requireMembership(): Promise<MembershipContext> {
  const m = await getCurrentMembership();
  if (!m) redirect("/login");
  return m;
}

// PORTEIRO VIP: exige um papel específico (ex: só dono).
export async function requireRole(
  roles: MemberRole | MemberRole[],
): Promise<MembershipContext> {
  const m = await requireMembership();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(m.role)) {
    redirect("/dashboard"); // não tem permissão → volta pro painel
  }
  return m;
}

// Atalhos de leitura
export function isOwner(m: MembershipContext) {
  return m.role === "owner";
}

// Quem enxerga TODOS os clientes: dono e recepção
export function canSeeAllClients(m: MembershipContext) {
  return m.role === "owner" || m.role === "reception";
}

// FILTRO DE CLIENTES conforme o papel:
// dono/recepção = todos da barbearia | barbeiro = só quem agendou com ele
export function clientScope(m: MembershipContext): Prisma.ClientWhereInput {
  if (canSeeAllClients(m)) {
    return { barbershopId: m.barbershopId };
  }
  return {
    barbershopId: m.barbershopId,
    appointments: { some: { professionalId: m.professionalId ?? "__none__" } },
  };
}

// FILTRO DE AGENDAMENTOS conforme o papel
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
