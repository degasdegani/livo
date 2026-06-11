"use server";

import { updateAppointmentStatusCore } from "@/lib/appointment-core";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "completed" | "cancelled" | "no_show",
) {
  const membership = await requireMembership();
  const result = await updateAppointmentStatusCore(
    appointmentId,
    status,
    membership,
  );
  if (!result.success) throw new Error(result.error);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
}
// ─── Adicionado no Dia 8 ─────────────────────────────────────────────────────

export async function getDashboardAnalytics(barbershopId: string) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioAnoPassado = new Date(
    agora.getFullYear() - 1,
    agora.getMonth() + 1,
    1,
  );

  // Últimos 12 meses de faturamento (comandas fechadas)
  const comandas12Meses = await db.comanda.findMany({
    where: {
      barbershopId,
      status: "closed",
      closedAt: { gte: inicioAnoPassado },
    },
    select: {
      totalInCents: true,
      closedAt: true,
      professional: { select: { name: true } },
      items: {
        select: {
          type: true,
          serviceName: true,
          quantity: true,
          totalInCents: true,
        },
      },
    },
    orderBy: { closedAt: "asc" },
  });

  // Faturamento do mês atual
  const faturamentoMes = comandas12Meses
    .filter((c) => c.closedAt && c.closedAt >= inicioMes)
    .reduce((sum, c) => sum + c.totalInCents, 0);

  // Total de comandas fechadas no mês
  const totalComandasMes = comandas12Meses.filter(
    (c) => c.closedAt && c.closedAt >= inicioMes,
  ).length;

  // Ticket médio do mês
  const ticketMedio =
    totalComandasMes > 0 ? Math.round(faturamentoMes / totalComandasMes) : 0;

  // Serviços mais vendidos no mês (top 5)
  const servicosMap = new Map<
    string,
    { nome: string; quantidade: number; totalInCents: number }
  >();
  for (const comanda of comandas12Meses) {
    if (!comanda.closedAt || comanda.closedAt < inicioMes) continue;
    for (const item of comanda.items) {
      if (item.type !== "service") continue;
      const key = item.serviceName;
      const atual = servicosMap.get(key) ?? {
        nome: item.serviceName,
        quantidade: 0,
        totalInCents: 0,
      };
      servicosMap.set(key, {
        nome: item.serviceName,
        quantidade: atual.quantidade + item.quantity,
        totalInCents: atual.totalInCents + item.totalInCents,
      });
    }
  }
  const topServicos = Array.from(servicosMap.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // Evolução mensal (últimos 12 meses)
  const evolucaoMap = new Map<string, number>();
  for (const comanda of comandas12Meses) {
    if (!comanda.closedAt) continue;
    const chave = `${comanda.closedAt.getFullYear()}-${String(comanda.closedAt.getMonth() + 1).padStart(2, "0")}`;
    evolucaoMap.set(
      chave,
      (evolucaoMap.get(chave) ?? 0) + comanda.totalInCents,
    );
  }
  // Garantir que todos os 12 meses aparecem, mesmo com valor 0
  const evolucaoMensal: { mes: string; label: string; totalInCents: number }[] =
    [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nomes = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    evolucaoMensal.push({
      mes: chave,
      label: `${nomes[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      totalInCents: evolucaoMap.get(chave) ?? 0,
    });
  }

  // Ranking de barbeiros no mês
  const barbeirosMap = new Map<
    string,
    { nome: string; faturamento: number; comandas: number }
  >();
  for (const comanda of comandas12Meses) {
    if (!comanda.closedAt || comanda.closedAt < inicioMes) continue;
    if (!comanda.professional) continue;
    const nome = comanda.professional.name;
    const atual = barbeirosMap.get(nome) ?? {
      nome,
      faturamento: 0,
      comandas: 0,
    };
    barbeirosMap.set(nome, {
      nome,
      faturamento: atual.faturamento + comanda.totalInCents,
      comandas: atual.comandas + 1,
    });
  }
  const rankingBarbeiros = Array.from(barbeirosMap.values()).sort(
    (a, b) => b.faturamento - a.faturamento,
  );

  return {
    faturamentoMes,
    totalComandasMes,
    ticketMedio,
    topServicos,
    evolucaoMensal,
    rankingBarbeiros,
  };
}
