// src/app/(dashboard)/dashboard/clients/actions.ts
"use server";

import type { ClientOrigem } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { dateOnlyToUTC } from "@/lib/date-only";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { clientScope, requireMembership, requireRole } from "@/lib/permissions";
import { captureEvent } from "@/lib/posthog";

const ANONYMIZED_NAME = "Cliente Removido";

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  origem: string | null;
  bloqueado: boolean;
  totalVisits: number;
  lastVisitAt: Date | null;
  createdAt: Date;
};

export async function getClientsData(filters?: {
  search?: string;
  origem?: string;
  sumidoDias?: number;
  aniversariantesMes?: boolean;
  soBloqueados?: boolean;
}) {
  const membership = await requireMembership();
  const scope = clientScope(membership);

  // Filtro de aniversariantes usa raw query (EXTRACT do Postgres)
  if (filters?.aniversariantesMes) {
    const month = new Date().getMonth() + 1;
    const rows = await db.$queryRaw`
      SELECT id, name, phone, email, cpf, "birthDate", origem, bloqueado,
             "totalVisits", "lastVisitAt", "createdAt"
      FROM "clients"
      WHERE "barbershopId" = ${membership.barbershopId}
        AND "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${month}
      ORDER BY EXTRACT(DAY FROM "birthDate") ASC
    `;
    return rows as ClientRow[];
  }

  const where: Record<string, unknown> = { ...scope };

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { cpf: { contains: filters.search } },
    ];
  }

  if (filters?.origem && filters.origem !== "todos") {
    where.origem = filters.origem as ClientOrigem;
  }

  if (filters?.soBloqueados) {
    where.bloqueado = true;
  }

  if (filters?.sumidoDias && filters.sumidoDias > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.sumidoDias);
    where.OR = [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }];
  }

  const clients = await db.client.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return clients;
}

export async function toggleClientBlock(clientId: string) {
  const membership = await requireMembership();
  const scope = clientScope(membership);

  const client = await db.client.findFirst({
    where: { id: clientId, ...scope },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  await db.client.update({
    where: { id: clientId },
    data: { bloqueado: !client.bloqueado },
  });

  revalidatePath("/dashboard/clients");
}

export async function updateClientNotes(clientId: string, notes: string) {
  const membership = await requireMembership();
  const scope = clientScope(membership);

  const client = await db.client.findFirst({
    where: { id: clientId, ...scope },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  await db.client.update({
    where: { id: clientId },
    data: { notes },
  });

  revalidatePath("/dashboard/clients");
}

export async function getClientStats() {
  const membership = await requireMembership();
  const barbershopId = membership.barbershopId;
  const month = new Date().getMonth() + 1;

  const [total, bloqueados, aniversariosRaw] = await Promise.all([
    db.client.count({ where: { barbershopId } }),
    db.client.count({ where: { barbershopId, bloqueado: true } }),
    db.$queryRaw`
      SELECT COUNT(*) as count FROM "clients"
      WHERE "barbershopId" = ${barbershopId}
        AND "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${month}
    `,
  ]);

  const aniversariantesMes = Number(
    (aniversariosRaw as Array<{ count: bigint }>)[0]?.count ?? 0,
  );

  return { total, bloqueados, aniversariantesMes };
}
export async function createClient(data: {
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  origem?: string;
  notes?: string;
}) {
  const membership = await requireMembership();

  // Normaliza telefone: só dígitos
  const phone = data.phone.replace(/\D/g, "");
  if (!phone) throw new Error("Telefone inválido.");

  // Verifica duplicata por telefone dentro da barbearia
  const existing = await db.client.findFirst({
    where: { barbershopId: membership.barbershopId, phone },
  });
  if (existing) throw new Error("Já existe um cliente com esse telefone.");

  await db.client.create({
    data: {
      barbershopId: membership.barbershopId,
      name: data.name.trim(),
      phone,
      email: data.email?.trim() || null,
      cpf: data.cpf?.replace(/\D/g, "") || null,
      birthDate: dateOnlyToUTC(data.birthDate),
      origem: data.origem ? (data.origem as ClientOrigem) : null,
      notes: data.notes?.trim() || null,
      bloqueado: false,
      totalVisits: 0,
    },
  });

  try {
    captureEvent(membership.barbershopId, "cliente_criado", membership.barbershopId, {
      source: "crm_manual",
    });
  } catch (err) {
    log.error("falha ao registrar evento de analytics (cliente_criado)", {
      barbershopId: membership.barbershopId,
    }, err);
  }

  revalidatePath("/dashboard/clients");
}

export async function updateClient(
  clientId: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    birthDate?: string;
    street?: string;
    neighborhood?: string;
    cep?: string;
    origem?: string;
    notes?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const membership = await requireMembership();
  const scope = clientScope(membership);

  const client = await db.client.findFirst({
    where: { id: clientId, ...scope },
  });
  if (!client) return { success: false, error: "Cliente não encontrado." };

  const phone = data.phone.replace(/\D/g, "");
  if (!phone) return { success: false, error: "Telefone inválido." };

  const duplicate = await db.client.findFirst({
    where: {
      phone,
      barbershopId: membership.barbershopId,
      NOT: { id: clientId },
    },
  });
  if (duplicate)
    return {
      success: false,
      error: "Já existe um cliente com esse telefone.",
    };

  await db.client.update({
    where: { id: clientId },
    data: {
      name: data.name.trim(),
      phone,
      email: data.email?.trim() || null,
      cpf: data.cpf?.replace(/\D/g, "") || null,
      birthDate: dateOnlyToUTC(data.birthDate),
      street: data.street?.trim() || null,
      neighborhood: data.neighborhood?.trim() || null,
      cep: data.cep?.replace(/\D/g, "") || null,
      origem: data.origem ? (data.origem as ClientOrigem) : null,
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath("/dashboard/clients");
  return { success: true };
}

// ─── LGPD — DIREITOS DO TITULAR (LIVO-003) ────────────────────────────────────
// anonymizeClient/exportClientData operam EXCLUSIVAMENTE sobre o titular
// (Client) e os snapshots de nome/telefone/e-mail que ele deixou em
// Appointment/Comanda. Nunca tocam WaitlistLead (regra inviolável — leads da
// waitlist nunca são deletados/alterados por aqui) nem o registro Barbershop.
// A isenção de planStatus=lifetime (TX Barbearia) é sobre a BARBEARIA nunca
// ser bloqueada/cobrada — não tem relação com o direito de um cliente pedir a
// remoção dos próprios dados, então não há (e não deve haver) guard de
// lifetime aqui.

export async function anonymizeClient(
  clientId: string,
  barbershopId: string,
): Promise<{ success: true } | { error: string }> {
  const membership = await requireRole("owner");

  // Nunca confiar no barbershopId informado isoladamente: precisa bater com a
  // barbearia da sessão autenticada, senão um owner de outra conta poderia
  // anonimizar cliente de terceiros.
  if (membership.barbershopId !== barbershopId) {
    return { error: "Cliente não encontrado." };
  }

  const client = await db.client.findFirst({
    where: { id: clientId, barbershopId },
    select: { id: true },
  });
  if (!client) return { error: "Cliente não encontrado." };

  await db.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: {
        // phone é obrigatório e único junto com barbershopId no schema — não
        // pode virar null. Usamos um placeholder determinístico por clientId
        // para nunca colidir com o unique constraint entre anonimizações.
        name: ANONYMIZED_NAME,
        phone: `anonimizado-${clientId}`,
        email: null,
        cpf: null,
        birthDate: null,
        cep: null,
        neighborhood: null,
        street: null,
        notes: null,
        anonymizedAt: new Date(),
      },
    });

    await tx.appointment.updateMany({
      where: { clientId, barbershopId },
      data: {
        clientName: ANONYMIZED_NAME,
        clientPhone: null,
        clientEmail: null,
      },
    });

    await tx.comanda.updateMany({
      where: { clientId, barbershopId },
      data: { clientName: ANONYMIZED_NAME },
    });
  });

  revalidatePath("/dashboard/clients");
  return { success: true };
}

export async function exportClientData(
  clientId: string,
  barbershopId: string,
): Promise<
  | {
      client: unknown;
      appointments: unknown[];
      comandas: unknown[];
      subscriptions: unknown[];
      packages: unknown[];
    }
  | { error: string }
> {
  const membership = await requireRole("owner");

  if (membership.barbershopId !== barbershopId) {
    return { error: "Cliente não encontrado." };
  }

  const client = await db.client.findFirst({
    where: { id: clientId, barbershopId },
  });
  if (!client) return { error: "Cliente não encontrado." };

  const [appointments, comandas, subscriptions, packages] = await Promise.all([
    db.appointment.findMany({
      where: { clientId, barbershopId },
      orderBy: { date: "desc" },
    }),
    db.comanda.findMany({
      where: { clientId, barbershopId },
      include: { items: true, payments: true },
      orderBy: { openedAt: "desc" },
    }),
    db.clientSubscription.findMany({
      where: { clientId, barbershopId },
      include: { plan: true, usages: true },
      orderBy: { createdAt: "desc" },
    }),
    db.clientPackage.findMany({
      where: { clientId, barbershopId },
      include: { items: true, package: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { client, appointments, comandas, subscriptions, packages };
}
