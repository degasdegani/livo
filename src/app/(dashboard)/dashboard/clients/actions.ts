// src/app/(dashboard)/dashboard/clients/actions.ts
"use server";

import { db } from "@/lib/db";
import { clientScope, requireMembership } from "@/lib/permissions";
import { ClientOrigem } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

export async function getClientStats(barbershopId: string) {
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
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      origem: data.origem ? (data.origem as ClientOrigem) : null,
      notes: data.notes?.trim() || null,
      bloqueado: false,
      totalVisits: 0,
    },
  });

  revalidatePath("/dashboard/clients");
}
