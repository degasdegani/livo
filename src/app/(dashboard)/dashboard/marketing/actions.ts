// src/app/(dashboard)/dashboard/marketing/actions.ts
"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

// ─────────────────────────────────────────────
// TIPOS EXPORTADOS
// ─────────────────────────────────────────────

export type ClienteSumido = {
  id: string;
  name: string;
  phone: string | null;
  lastVisitAt: Date | null;
  totalVisits: number;
};

export type Aniversariante = {
  id: string;
  name: string;
  phone: string | null;
  birthDate: Date;
  diaMes: number;
};

export type DiasSumido = 30 | 60 | 90;

// ─────────────────────────────────────────────
// CLIENTES SUMIDOS
// ─────────────────────────────────────────────

export async function getClientesSumidos(
  dias: DiasSumido = 30,
): Promise<ClienteSumido[]> {
  const membership = await requireRole(["owner", "reception", "barber"]);
  const barbershopId = membership.barbershopId;

  const diasAtras = new Date();
  diasAtras.setDate(diasAtras.getDate() - dias);

  if (membership.role === "barber" && membership.professionalId) {
    const atendimentos = await db.appointment.findMany({
      where: {
        barbershopId,
        professionalId: membership.professionalId,
        clientId: { not: null },
      },
      select: { clientId: true },
      distinct: ["clientId"],
    });

    const clientIds = atendimentos
      .map((a) => a.clientId)
      .filter((id): id is string => id !== null);

    if (clientIds.length === 0) return [];

    return db.client.findMany({
      where: {
        id: { in: clientIds },
        barbershopId,
        bloqueado: false,
        OR: [{ lastVisitAt: { lt: diasAtras } }, { lastVisitAt: null }],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastVisitAt: true,
        totalVisits: true,
      },
      orderBy: { lastVisitAt: "asc" },
    });
  }

  return db.client.findMany({
    where: {
      barbershopId,
      bloqueado: false,
      OR: [{ lastVisitAt: { lt: diasAtras } }, { lastVisitAt: null }],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      lastVisitAt: true,
      totalVisits: true,
    },
    orderBy: { lastVisitAt: "asc" },
  });
}

// ─────────────────────────────────────────────
// ANIVERSARIANTES DO MÊS
// ─────────────────────────────────────────────

export async function getAniversariantes(): Promise<Aniversariante[]> {
  const membership = await requireRole(["owner", "reception", "barber"]);
  const barbershopId = membership.barbershopId;

  const mesAtual = new Date().getMonth() + 1;

  // IMPORTANTE: colunas sem @map() no schema ficam em camelCase no banco.
  // "birthDate" (não birth_date), "barbershopId" (não barbershop_id), etc.
  // Apenas a TABELA usa snake_case via @@map("clients").
  type RawCliente = {
    id: string;
    name: string;
    phone: string | null;
    birthDate: Date;
    diaMes: number;
  };

  let rows: RawCliente[];

  if (membership.role === "barber" && membership.professionalId) {
    const atendimentos = await db.appointment.findMany({
      where: {
        barbershopId,
        professionalId: membership.professionalId,
        clientId: { not: null },
      },
      select: { clientId: true },
      distinct: ["clientId"],
    });

    const clientIds = atendimentos
      .map((a) => a.clientId)
      .filter((id): id is string => id !== null);

    if (clientIds.length === 0) return [];

    rows = await db.$queryRaw<RawCliente[]>`
      SELECT
        id,
        name,
        phone,
        "birthDate",
        EXTRACT(DAY FROM "birthDate")::int AS "diaMes"
      FROM clients
      WHERE "barbershopId" = ${barbershopId}
        AND bloqueado = false
        AND "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${mesAtual}
        AND id = ANY(${clientIds}::text[])
      ORDER BY EXTRACT(DAY FROM "birthDate") ASC
    `;
  } else {
    rows = await db.$queryRaw<RawCliente[]>`
      SELECT
        id,
        name,
        phone,
        "birthDate",
        EXTRACT(DAY FROM "birthDate")::int AS "diaMes"
      FROM clients
      WHERE "barbershopId" = ${barbershopId}
        AND bloqueado = false
        AND "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${mesAtual}
      ORDER BY EXTRACT(DAY FROM "birthDate") ASC
    `;
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    birthDate: row.birthDate,
    diaMes: Number(row.diaMes),
  }));
}
