import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPeriodWindow, TvPeriod } from "../../tv-period";

const VALID_PERIODS: TvPeriod[] = ["DAY", "WEEK", "MONTH"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token") ?? "";
  const period = (searchParams.get("period") ?? "DAY").toUpperCase() as TvPeriod;

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 401 });
  }
  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: "Periodo invalido." }, { status: 400 });
  }

  // Validar device token
  const device = await db.tvDevice.findUnique({
    where: { token },
    select: { id: true, barbershopId: true },
  });
  if (!device) {
    return NextResponse.json(
      { error: "Token invalido ou revogado." },
      { status: 401 },
    );
  }

  // Atualizar lastSeenAt (fire-and-forget — não bloqueia a resposta)
  db.tvDevice
    .update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {
      /* ignorar falha não-crítica */
    });

  const { barbershopId } = device;
  const { start, end } = getPeriodWindow(period);

  // ── Faturamento do período (meta geral) ───────────────────────
  // Comanda.status === "closed" + Comanda.closedAt na janela (confirmado em
  // relatorios/actions.ts). Soma de totalInCents — mesma fonte do relatório.
  const revenueAgg = await db.comanda.aggregate({
    where: {
      barbershopId,
      status: "closed",
      closedAt: { gte: start, lte: end },
    },
    _sum: { totalInCents: true },
  });
  const revenueInCents = revenueAgg._sum.totalInCents ?? 0;

  // Meta geral do período
  const barbershopGoal = await db.barbershopGoal.findUnique({
    where: { barbershopId_period: { barbershopId, period } },
    select: { targetInCents: true },
  });
  const goalInCents = barbershopGoal?.targetInCents ?? 0;
  const generalProgressPercent =
    goalInCents > 0
      ? Math.min(Math.round((revenueInCents / goalInCents) * 100), 999)
      : 0;
  const achieved = goalInCents > 0 && revenueInCents >= goalInCents;

  // ── Ranking dos profissionais ──────────────────────────────────
  // Profissionais ativos da barbearia
  const professionals = await db.professional.findMany({
    where: { barbershopId, isActive: true },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  // Contar serviços realizados por profissional no período.
  // Atribuição via Comanda.professionalId (campo direto, obrigatório).
  // Conta apenas itens de serviço (ComandaItem.type === "service"),
  // somando a quantidade de cada item.
  const serviceItems = await db.comandaItem.findMany({
    where: {
      type: "service",
      comanda: {
        barbershopId,
        status: "closed",
        closedAt: { gte: start, lte: end },
      },
    },
    select: {
      quantity: true,
      comanda: { select: { professionalId: true } },
    },
  });

  const countMap = new Map<string, number>();
  for (const item of serviceItems) {
    const pid = item.comanda.professionalId;
    countMap.set(pid, (countMap.get(pid) ?? 0) + item.quantity);
  }

  // Metas individuais do período
  const profGoals = await db.professionalGoal.findMany({
    where: {
      barbershopId,
      period,
      professionalId: { in: professionals.map((p) => p.id) },
    },
    select: { professionalId: true, targetServices: true },
  });
  const goalMap = new Map(
    profGoals.map((g) => [g.professionalId, g.targetServices]),
  );

  // Montar ranking (ordenado por servicesCount desc)
  const ranking = professionals
    .map((p) => {
      const servicesCount = countMap.get(p.id) ?? 0;
      const goalTarget = goalMap.get(p.id) ?? 0;
      const goalPercent =
        goalTarget > 0
          ? Math.min(Math.round((servicesCount / goalTarget) * 100), 999)
          : 0;
      return {
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl ?? null,
        servicesCount,
        goalTarget,
        goalPercent,
      };
    })
    .sort((a, b) => b.servicesCount - a.servicesCount);

  // Nome da barbearia
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { name: true },
  });

  return NextResponse.json({
    barbershopName: barbershop?.name ?? "",
    period,
    generalProgressPercent,
    achieved,
    ranking,
    // Metadado para o cliente saber quando foi gerado
    generatedAt: new Date().toISOString(),
  });
}
