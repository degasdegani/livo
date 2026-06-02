"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export type PeriodoFiltro = "semana" | "mes" | "mes_anterior" | "ano";

function calcularIntervalo(periodo: PeriodoFiltro): {
  inicio: Date;
  fim: Date;
  label: string;
} {
  const agora = new Date();

  if (periodo === "semana") {
    const diaSemana = agora.getDay(); // 0=Dom
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - diaSemana);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim, label: "Esta semana" };
  }

  if (periodo === "mes") {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const nomes = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    return {
      inicio,
      fim,
      label: `${nomes[agora.getMonth()]} ${agora.getFullYear()}`,
    };
  }

  if (periodo === "mes_anterior") {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const fim = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    const nomes = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    return {
      inicio,
      fim,
      label: `${nomes[inicio.getMonth()]} ${inicio.getFullYear()}`,
    };
  }

  // ano
  const inicio = new Date(agora.getFullYear(), 0, 1);
  const fim = new Date(agora.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { inicio, fim, label: `Ano ${agora.getFullYear()}` };
}

export async function getRelatorioData(periodo: PeriodoFiltro = "mes") {
  const membership = await requireRole(["owner", "reception"]);
  const { barbershopId, role } = membership;
  const { inicio, fim, label } = calcularIntervalo(periodo);

  // Todas as comandas fechadas no período
  const comandas = await db.comanda.findMany({
    where: {
      barbershopId,
      status: "closed",
      closedAt: { gte: inicio, lte: fim },
    },
    select: {
      id: true,
      totalInCents: true,
      closedAt: true,
      paymentMethod: true,
      clientName: true,
      professional: { select: { id: true, name: true } },
      items: {
        select: {
          type: true,
          serviceName: true,
          productName: true,
          quantity: true,
          totalInCents: true,
          commissionValue: true,
        },
      },
    },
    orderBy: { closedAt: "desc" },
  });

  // KPIs principais
  const faturamentoTotal = comandas.reduce((s, c) => s + c.totalInCents, 0);
  const totalComandas = comandas.length;
  const ticketMedio =
    totalComandas > 0 ? Math.round(faturamentoTotal / totalComandas) : 0;

  // Clientes únicos atendidos (pelo clientName — não temos clientId obrigatório)
  const clientesUnicos = new Set(
    comandas.map((c) => c.clientName.toLowerCase().trim()),
  ).size;

  // Faturamento por método de pagamento
  const porPagamento = new Map<string, number>();
  for (const c of comandas) {
    const metodo = c.paymentMethod ?? "Não informado";
    porPagamento.set(metodo, (porPagamento.get(metodo) ?? 0) + c.totalInCents);
  }
  const pagamentos = Array.from(porPagamento.entries())
    .map(([metodo, total]) => ({ metodo: traduzirPagamento(metodo), total }))
    .sort((a, b) => b.total - a.total);

  // Top serviços
  const servicosMap = new Map<
    string,
    { nome: string; quantidade: number; totalInCents: number }
  >();
  for (const c of comandas) {
    for (const item of c.items) {
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
    .slice(0, 10);

  // Top produtos
  const produtosMap = new Map<
    string,
    { nome: string; quantidade: number; totalInCents: number }
  >();
  for (const c of comandas) {
    for (const item of c.items) {
      if (item.type !== "product") continue;
      const key = item.productName ?? "Produto";
      const atual = produtosMap.get(key) ?? {
        nome: key,
        quantidade: 0,
        totalInCents: 0,
      };
      produtosMap.set(key, {
        nome: key,
        quantidade: atual.quantidade + item.quantity,
        totalInCents: atual.totalInCents + item.totalInCents,
      });
    }
  }
  const topProdutos = Array.from(produtosMap.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // Ranking de barbeiros (só para owner)
  const barbeirosMap = new Map<
    string,
    { nome: string; faturamento: number; comandas: number; comissoes: number }
  >();
  if (role === "owner") {
    for (const c of comandas) {
      if (!c.professional) continue;
      const nome = c.professional.name;
      const comissoesComanda = c.items.reduce(
        (s, i) => s + (i.commissionValue ?? 0),
        0,
      );
      const atual = barbeirosMap.get(nome) ?? {
        nome,
        faturamento: 0,
        comandas: 0,
        comissoes: 0,
      };
      barbeirosMap.set(nome, {
        nome,
        faturamento: atual.faturamento + c.totalInCents,
        comandas: atual.comandas + 1,
        comissoes: atual.comissoes + comissoesComanda,
      });
    }
  }
  const rankingBarbeiros = Array.from(barbeirosMap.values()).sort(
    (a, b) => b.faturamento - a.faturamento,
  );

  // Evolução diária dentro do período (para gráfico de barras)
  // Agrupa por dia se período ≤ 31 dias, senão por semana
  const diasDiff = Math.ceil(
    (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
  );
  const evolucao: { label: string; totalInCents: number }[] = [];

  if (diasDiff <= 31) {
    // Por dia
    const porDia = new Map<string, number>();
    for (const c of comandas) {
      if (!c.closedAt) continue;
      const d = c.closedAt;
      const chave = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      porDia.set(chave, (porDia.get(chave) ?? 0) + c.totalInCents);
    }
    // Preenche todos os dias do intervalo
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      const chave = `${cursor.getDate().toString().padStart(2, "0")}/${(cursor.getMonth() + 1).toString().padStart(2, "0")}`;
      evolucao.push({ label: chave, totalInCents: porDia.get(chave) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    // Por mês (para o ano)
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
    const porMes = new Map<number, number>();
    for (const c of comandas) {
      if (!c.closedAt) continue;
      const m = c.closedAt.getMonth();
      porMes.set(m, (porMes.get(m) ?? 0) + c.totalInCents);
    }
    for (let m = 0; m <= 11; m++) {
      evolucao.push({ label: nomes[m], totalInCents: porMes.get(m) ?? 0 });
    }
  }

  return {
    periodoLabel: label,
    kpis: { faturamentoTotal, totalComandas, ticketMedio, clientesUnicos },
    pagamentos,
    topServicos,
    topProdutos,
    rankingBarbeiros,
    evolucao,
    role,
  };
}

function traduzirPagamento(metodo: string): string {
  const mapa: Record<string, string> = {
    cash: "Dinheiro",
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    voucher: "Voucher",
  };
  return mapa[metodo] ?? metodo;
}
