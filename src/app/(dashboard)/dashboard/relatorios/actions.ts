"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { generateCsv, generateExcel, type ExportColumn } from "@/lib/reports/export";
import {
  getAssinaturasReport,
  getClientesReport,
  getComandasReport,
  getComissoesReport,
  getFaturamentoReport,
  getPacotesReport,
  type Periodo,
} from "@/lib/reports/queries";

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
      clientId: true,
      professional: { select: { id: true, name: true } },
      payments: { select: { method: true, amountInCents: true } },
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

  // Clientes únicos atendidos: contagem por clientId (FK relacional).
  // Comandas sem clientId (atendimentos anônimos) não possuem identidade distinta — não contabilizados.
  const clientesUnicos = new Set(
    comandas.map((c) => c.clientId).filter((id): id is string => id !== null),
  ).size;

  // Faturamento por método de pagamento
  // Comandas com ComandaPayment (split): usa cada registro individualmente.
  // Comandas legado sem registros: fallback para paymentMethod + totalInCents.
  const porPagamento = new Map<string, number>();
  for (const c of comandas) {
    if (c.payments.length > 0) {
      for (const p of c.payments) {
        porPagamento.set(p.method, (porPagamento.get(p.method) ?? 0) + p.amountInCents);
      }
    } else {
      const metodo = c.paymentMethod ?? "Não informado";
      porPagamento.set(metodo, (porPagamento.get(metodo) ?? 0) + c.totalInCents);
    }
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

  // ── Pacotes — secao SEPARADA, nunca somada ao faturamentoTotal de comandas ──
  // Duas queries independentes da query de comandas acima:
  //  (a) "A receber": todos os ClientPackage pendentes, SEM filtro de periodo
  //      (saldo em aberto, nao um fluxo do periodo).
  //  (b) "Recebido no periodo": pagos com paidAt dentro do intervalo do relatorio.
  //      Receita reconhecida na data do pagamento; os consumos ja entram a R$0
  //      na comanda (Etapa 4), entao nao ha dupla contagem.
  const [aReceber, receitaPacotes] = await Promise.all([
    db.clientPackage.aggregate({
      where: { barbershopId, paymentStatus: "pending" },
      _sum: { priceInCents: true },
      _count: true,
    }),
    db.clientPackage.aggregate({
      where: {
        barbershopId,
        paymentStatus: "paid",
        paidAt: { gte: inicio, lte: fim },
      },
      _sum: { priceInCents: true },
      _count: true,
    }),
  ]);

  return {
    periodoLabel: label,
    kpis: { faturamentoTotal, totalComandas, ticketMedio, clientesUnicos },
    pagamentos,
    topServicos,
    topProdutos,
    rankingBarbeiros,
    evolucao,
    pacotes: {
      aReceberInCents: aReceber._sum.priceInCents ?? 0,
      aReceberCount: aReceber._count,
      receitaPeriodoInCents: receitaPacotes._sum.priceInCents ?? 0,
      receitaPeriodoCount: receitaPacotes._count,
    },
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

// ═══════════════════════════════════════════════════════════════════════════
// Exportação (Excel / CSV) — acesso restrito a owner (dado agregado sensível,
// mesmo padrão de requireRole(["owner"]) usado em pacotes/combos/profissionais).
// ═══════════════════════════════════════════════════════════════════════════

export type TipoRelatorioExport =
  | "faturamento"
  | "comissoes"
  | "comandas"
  | "clientes"
  | "assinaturas"
  | "pacotes";

export type FormatoExport = "excel" | "csv";

export type ExportRelatorioInput = {
  tipo: TipoRelatorioExport;
  formato: FormatoExport;
  periodo?: { from: string; to: string };
};

export type ExportRelatorioResult = {
  filename: string;
  mimeType: string;
  base64: string;
};

const TIPOS_COM_PERIODO: TipoRelatorioExport[] = ["faturamento", "comissoes", "comandas"];

function formatMoneyBR(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(d: Date | null): string {
  return d ? d.toLocaleDateString("pt-BR") : "";
}

function formatDateTimeBR(d: Date | null): string {
  return d
    ? d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

const STATUS_COMANDA: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada",
};

const STATUS_ASSINATURA: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

const STATUS_PACOTE: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
};

async function buildExportData(
  barbershopId: string,
  tipo: TipoRelatorioExport,
  periodo?: Periodo,
): Promise<{ data: Record<string, unknown>[]; columns: ExportColumn[]; nomeBase: string }> {
  switch (tipo) {
    case "faturamento": {
      const rows = await getFaturamentoReport(barbershopId, periodo);
      return {
        nomeBase: "faturamento",
        columns: [
          { key: "data", header: "Data" },
          { key: "cliente", header: "Cliente" },
          { key: "profissional", header: "Profissional" },
          { key: "pagamento", header: "Pagamento" },
          { key: "bruto", header: "Bruto" },
          { key: "comissao", header: "Comissão" },
          { key: "liquido", header: "Líquido" },
        ],
        data: rows.map((r) => ({
          data: formatDateTimeBR(r.closedAt),
          cliente: r.clientName,
          profissional: r.professionalName,
          pagamento: r.paymentMethods,
          bruto: formatMoneyBR(r.totalInCents),
          comissao: formatMoneyBR(r.commissionInCents),
          liquido: formatMoneyBR(r.liquidoInCents),
        })),
      };
    }
    case "comissoes": {
      const rows = await getComissoesReport(barbershopId, periodo);
      return {
        nomeBase: "comissoes",
        columns: [
          { key: "profissional", header: "Profissional" },
          { key: "periodo", header: "Período" },
          { key: "valorGerado", header: "Valor Gerado" },
          { key: "valorComissao", header: "Comissão a Pagar" },
        ],
        data: rows.map((r) => ({
          profissional: r.professionalName,
          periodo: r.periodoLabel,
          valorGerado: formatMoneyBR(r.valorGeradoInCents),
          valorComissao: formatMoneyBR(r.valorComissaoInCents),
        })),
      };
    }
    case "comandas": {
      const rows = await getComandasReport(barbershopId, periodo);
      return {
        nomeBase: "comandas",
        columns: [
          { key: "aberta", header: "Aberta em" },
          { key: "fechada", header: "Fechada em" },
          { key: "cliente", header: "Cliente" },
          { key: "profissional", header: "Profissional" },
          { key: "status", header: "Status" },
          { key: "pagamento", header: "Pagamento" },
          { key: "itens", header: "Itens" },
          { key: "total", header: "Total" },
        ],
        data: rows.map((r) => ({
          aberta: formatDateTimeBR(r.openedAt),
          fechada: formatDateTimeBR(r.closedAt),
          cliente: r.clientName,
          profissional: r.professionalName,
          status: STATUS_COMANDA[r.status] ?? r.status,
          pagamento: r.paymentMethods,
          itens: r.itemsSummary,
          total: formatMoneyBR(r.totalInCents),
        })),
      };
    }
    case "clientes": {
      const rows = await getClientesReport(barbershopId);
      return {
        nomeBase: "clientes",
        columns: [
          { key: "nome", header: "Nome" },
          { key: "telefone", header: "Telefone" },
          { key: "email", header: "E-mail" },
          { key: "cadastro", header: "Cadastro" },
          { key: "ultimaVisita", header: "Última Visita" },
          { key: "totalVisitas", header: "Total de Visitas" },
          { key: "origem", header: "Origem" },
          { key: "nascimento", header: "Nascimento" },
          { key: "cpf", header: "CPF" },
        ],
        data: rows.map((r) => ({
          nome: r.name,
          telefone: r.phone,
          email: r.email ?? "",
          cadastro: formatDateBR(r.createdAt),
          ultimaVisita: formatDateBR(r.lastVisitAt),
          totalVisitas: r.totalVisits,
          origem: r.origem ?? "",
          nascimento: formatDateBR(r.birthDate),
          cpf: r.cpf ?? "",
        })),
      };
    }
    case "assinaturas": {
      const rows = await getAssinaturasReport(barbershopId);
      return {
        nomeBase: "assinaturas",
        columns: [
          { key: "cliente", header: "Cliente" },
          { key: "plano", header: "Plano" },
          { key: "status", header: "Status" },
          { key: "inicio", header: "Início" },
          { key: "fimCiclo", header: "Fim do Ciclo Atual" },
          { key: "valor", header: "Valor do Plano" },
        ],
        data: rows.map((r) => ({
          cliente: r.clientName,
          plano: r.planName,
          status: STATUS_ASSINATURA[r.status] ?? r.status,
          inicio: formatDateBR(r.startedAt),
          fimCiclo: formatDateBR(r.currentPeriodEnd),
          valor: formatMoneyBR(r.priceInCents),
        })),
      };
    }
    case "pacotes": {
      const rows = await getPacotesReport(barbershopId);
      return {
        nomeBase: "pacotes",
        columns: [
          { key: "cliente", header: "Cliente" },
          { key: "pacote", header: "Pacote" },
          { key: "statusPagamento", header: "Status Pagamento" },
          { key: "valor", header: "Valor" },
          { key: "expiraEm", header: "Expira em" },
          { key: "uso", header: "Uso" },
        ],
        data: rows.map((r) => ({
          cliente: r.clientName,
          pacote: r.packageName,
          statusPagamento: STATUS_PACOTE[r.paymentStatus] ?? r.paymentStatus,
          valor: formatMoneyBR(r.priceInCents),
          expiraEm: formatDateBR(r.expiresAt),
          uso: r.uso,
        })),
      };
    }
  }
}

export async function exportRelatorio(
  input: ExportRelatorioInput,
): Promise<ExportRelatorioResult> {
  const { barbershopId } = await requireRole(["owner"]);

  const periodo: Periodo | undefined =
    TIPOS_COM_PERIODO.includes(input.tipo) && input.periodo
      ? { from: new Date(input.periodo.from), to: new Date(input.periodo.to) }
      : undefined;

  const { data, columns, nomeBase } = await buildExportData(
    barbershopId,
    input.tipo,
    periodo,
  );

  const dataArquivo = new Date().toISOString().slice(0, 10);

  if (input.formato === "excel") {
    const buffer = await generateExcel(data, columns);
    return {
      filename: `${nomeBase}-${dataArquivo}.xlsx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: buffer.toString("base64"),
    };
  }

  const csv = generateCsv(data, columns);
  return {
    filename: `${nomeBase}-${dataArquivo}.csv`,
    mimeType: "text/csv;charset=utf-8",
    base64: Buffer.from(csv, "utf-8").toString("base64"),
  };
}
