"use server";

import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import {
  ComandaStatus,
  MemberRole,
  PaymentMethod,
  Prisma,
  StockMovementReason,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ComandaWithItems = Prisma.ComandaGetPayload<{
  include: {
    professional: {
      select: {
        id: true;
        name: true;
      };
    };
    client: {
      select: {
        id: true;
        name: true;
        phone: true;
      };
    };
    appointment: {
      select: {
        id: true;
      };
    };
    items: true;
  };
}>;

// ─── LISTAR COMANDAS ────────────────────────────────────────────────────────

export async function getComandas(
  filtro: "abertas" | "hoje" | "fechadas" | "todas" = "abertas",
) {
  const membership = await requireMembership();

  const where: Record<string, unknown> = {
    barbershopId: membership.barbershopId,
  };

  if (membership.role === MemberRole.barber && membership.professionalId) {
    where.professionalId = membership.professionalId;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  if (filtro === "abertas") {
    where.status = ComandaStatus.open;
  } else if (filtro === "hoje") {
    where.openedAt = { gte: hoje, lt: amanha };
  } else if (filtro === "fechadas") {
    where.status = ComandaStatus.closed;
  }

  const comandas = await db.comanda.findMany({
    where,
    include: {
      professional: { select: { name: true } },
      client: { select: { name: true } },
      items: true,
    },
    orderBy: { openedAt: "desc" },
    take: 100,
  });

  return comandas;
}

// ─── BUSCAR COMANDA ÚNICA ────────────────────────────────────────────────────

export async function getComanda(id: string) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id,
      barbershopId: membership.barbershopId,
    },
    include: {
      professional: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, phone: true } },
      appointment: { select: { id: true } },
      items: {
        orderBy: { id: "asc" },
      },
    },
  });

  return comanda;
}

// ─── ABRIR COMANDA ───────────────────────────────────────────────────────────

export async function abrirComanda(data: {
  professionalId: string;
  clientId?: string;
  clientName: string;
  notes?: string;
  appointmentId?: string;
}) {
  const membership = await requireMembership();

  if (
    membership.role === MemberRole.barber &&
    membership.professionalId !== data.professionalId
  ) {
    throw new Error("Barbeiro só pode abrir comanda para si mesmo.");
  }

  const comanda = await db.comanda.create({
    data: {
      barbershopId: membership.barbershopId,
      professionalId: data.professionalId,
      clientId: data.clientId || null,
      clientName: data.clientName,
      notes: data.notes || null,
      appointmentId: data.appointmentId || null,
      status: ComandaStatus.open,
      totalInCents: 0,
    },
  });

  redirect(`/dashboard/comandas/${comanda.id}`);
}

// ─── ADICIONAR ITEM (SERVIÇO) ────────────────────────────────────────────────

export async function addServicoItem(comandaId: string, serviceId: string) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: ComandaStatus.open,
    },
  });
  if (!comanda) throw new Error("Comanda não encontrada ou já fechada.");

  const service = await db.service.findFirst({
    where: {
      id: serviceId,
      barbershopId: membership.barbershopId,
      isActive: true,
    },
  });
  if (!service) throw new Error("Serviço não encontrado.");

  await db.$transaction([
    db.comandaItem.create({
      data: {
        comandaId,
        type: "service",
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.priceInCents,
        productName: "",
        productPrice: 0,
        quantity: 1,
        unitPriceInCents: service.priceInCents,
        totalInCents: service.priceInCents,
      },
    }),
    db.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: { increment: service.priceInCents } },
    }),
  ]);

  revalidatePath(`/dashboard/comandas/${comandaId}`);
}

// ─── ADICIONAR ITEM (PRODUTO) ────────────────────────────────────────────────

export async function addProdutoItem(
  comandaId: string,
  productId: string,
  quantity: number,
) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: ComandaStatus.open,
    },
  });
  if (!comanda) throw new Error("Comanda não encontrada ou já fechada.");

  const product = await db.product.findFirst({
    where: {
      id: productId,
      barbershopId: membership.barbershopId,
      isActive: true,
    },
  });
  if (!product) throw new Error("Produto não encontrado.");
  if (product.stockQuantity < quantity)
    throw new Error("Estoque insuficiente.");

  const total = product.priceInCents * quantity;

  await db.$transaction([
    db.comandaItem.create({
      data: {
        comandaId,
        type: "product",
        productId: product.id,
        productName: product.name,
        productPrice: product.priceInCents,
        serviceName: "",
        servicePrice: 0,
        quantity,
        unitPriceInCents: product.priceInCents,
        totalInCents: total,
      },
    }),
    db.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: { increment: total } },
    }),
  ]);

  revalidatePath(`/dashboard/comandas/${comandaId}`);
}

// ─── REMOVER ITEM ────────────────────────────────────────────────────────────

export async function removeItem(itemId: string, comandaId: string) {
  const membership = await requireMembership();

  const item = await db.comandaItem.findFirst({
    where: { id: itemId, comandaId },
    include: { comanda: true },
  });

  if (!item || item.comanda.barbershopId !== membership.barbershopId) {
    throw new Error("Item não encontrado.");
  }
  if (item.comanda.status !== ComandaStatus.open) {
    throw new Error("Comanda já fechada.");
  }

  await db.$transaction([
    db.comandaItem.delete({ where: { id: itemId } }),
    db.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: { decrement: item.totalInCents } },
    }),
  ]);

  revalidatePath(`/dashboard/comandas/${comandaId}`);
}

// ─── FECHAR COMANDA (com cálculo de comissões) ───────────────────────────────

export async function fecharComanda(
  comandaId: string,
  paymentMethod: PaymentMethod,
  discountInCents: number = 0,
) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: ComandaStatus.open,
    },
    include: { items: true },
  });

  if (!comanda) throw new Error("Comanda não encontrada ou já fechada.");

  // Buscar Membership do profissional para calcular comissão
  const profMembership = await db.membership.findFirst({
    where: {
      barbershopId: comanda.barbershopId,
      professionalId: comanda.professionalId,
      isActive: true,
    },
  });

  const totalFinal = Math.max(0, comanda.totalInCents - discountInCents);

  await db.$transaction(async (tx) => {
    // 1. Calcular e gravar comissão em cada item
    for (const item of comanda.items) {
      let pct: number | null = null;
      let value: number | null = null;

      if (profMembership) {
        if (
          item.type === "service" &&
          profMembership.commissionOnServices &&
          profMembership.commissionServicePct !== null
        ) {
          pct = Number(profMembership.commissionServicePct);
          value = Math.round((item.totalInCents * pct) / 100);
        } else if (
          item.type === "product" &&
          profMembership.commissionOnProducts &&
          profMembership.commissionProductPct !== null
        ) {
          pct = Number(profMembership.commissionProductPct);
          value = Math.round((item.totalInCents * pct) / 100);
        }
      }

      await tx.comandaItem.update({
        where: { id: item.id },
        data: {
          commissionPct: pct,
          commissionValue: value,
        },
      });
    }

    // 2. Baixar estoque dos produtos
    const produtoItems = comanda.items.filter(
      (i) => i.type === "product" && i.productId,
    );
    for (const item of produtoItems) {
      await tx.product.update({
        where: { id: item.productId! },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId!,
          barbershopId: comanda.barbershopId,
          quantity: -item.quantity,
          reason: StockMovementReason.comanda_use,
          notes: `Comanda fechada`,
        },
      });
    }

    // 3. Fechar a comanda
    await tx.comanda.update({
      where: { id: comandaId },
      data: {
        status: ComandaStatus.closed,
        paymentMethod,
        totalInCents: totalFinal,
        closedAt: new Date(),
      },
    });
  });

  revalidatePath(`/dashboard/comandas`);
  revalidatePath(`/dashboard/comandas/${comandaId}`);
  redirect(`/dashboard/comandas`);
}

// ─── CANCELAR COMANDA ────────────────────────────────────────────────────────

export async function cancelarComanda(comandaId: string) {
  await requireRole(["owner"]);

  const comanda = await db.comanda.findFirst({
    where: { id: comandaId },
    include: { items: true },
  });

  if (!comanda) throw new Error("Comanda não encontrada.");
  if (comanda.status === ComandaStatus.cancelled)
    throw new Error("Já cancelada.");

  await db.$transaction(async (tx) => {
    // Estornar estoque apenas se estava fechada
    if (comanda.status === ComandaStatus.closed) {
      const prodItems = comanda.items.filter(
        (i) => i.type === "product" && i.productId,
      );
      for (const item of prodItems) {
        await tx.product.update({
          where: { id: item.productId! },
          data: { stockQuantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId!,
            barbershopId: comanda.barbershopId,
            quantity: item.quantity,
            reason: StockMovementReason.return,
            notes: `Cancelamento de comanda`,
          },
        });
      }
    }

    await tx.comanda.update({
      where: { id: comandaId },
      data: { status: ComandaStatus.cancelled },
    });
  });

  revalidatePath(`/dashboard/comandas`);
  redirect(`/dashboard/comandas`);
}

// ─── DADOS PARA COMISSÕES ─────────────────────────────────────────────────────

export type ResumoProf = {
  professionalId: string;
  professionalName: string;
  totalComandas: number;
  totalFaturamento: number;
  totalComissaoServicos: number;
  totalComissaoProdutos: number;
  totalComissao: number;
};

export async function getComissoesData(
  periodo:
    | "mes_atual"
    | "mes_anterior"
    | "ultimos_30"
    | "ultimos_90" = "mes_atual",
  professionalId?: string,
) {
  const membership = await requireMembership();

  const profId =
    membership.role === MemberRole.barber
      ? (membership.professionalId ?? undefined)
      : professionalId;

  const hoje = new Date();
  let dataInicio: Date;
  let dataFim: Date;

  if (periodo === "mes_atual") {
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
  } else if (periodo === "mes_anterior") {
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
  } else if (periodo === "ultimos_30") {
    dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    dataFim = hoje;
  } else {
    dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 90);
    dataFim = hoje;
  }

  const where: Record<string, unknown> = {
    barbershopId: membership.barbershopId,
    status: ComandaStatus.closed,
    closedAt: { gte: dataInicio, lte: dataFim },
  };

  if (profId) {
    where.professionalId = profId;
  }

  const comandas = await db.comanda.findMany({
    where,
    include: {
      professional: { select: { id: true, name: true } },
      items: {
        where: { commissionValue: { not: null } },
      },
    },
    orderBy: { closedAt: "desc" },
  });

  const porProfissional: Record<string, ResumoProf> = {};

  for (const comanda of comandas) {
    const pid = comanda.professionalId;
    if (!porProfissional[pid]) {
      porProfissional[pid] = {
        professionalId: pid,
        professionalName: comanda.professional?.name ?? "—",
        totalComandas: 0,
        totalFaturamento: 0,
        totalComissaoServicos: 0,
        totalComissaoProdutos: 0,
        totalComissao: 0,
      };
    }

    porProfissional[pid].totalComandas += 1;
    porProfissional[pid].totalFaturamento += comanda.totalInCents;

    for (const item of comanda.items) {
      if (item.commissionValue !== null) {
        if (item.type === "service") {
          porProfissional[pid].totalComissaoServicos += item.commissionValue;
        } else {
          porProfissional[pid].totalComissaoProdutos += item.commissionValue;
        }
        porProfissional[pid].totalComissao += item.commissionValue;
      }
    }
  }

  const profissionais = await db.professional.findMany({
    where: { barbershopId: membership.barbershopId, isActive: true },
    select: { id: true, name: true },
  });

  for (const prof of profissionais) {
    if (!porProfissional[prof.id]) {
      porProfissional[prof.id] = {
        professionalId: prof.id,
        professionalName: prof.name,
        totalComandas: 0,
        totalFaturamento: 0,
        totalComissaoServicos: 0,
        totalComissaoProdutos: 0,
        totalComissao: 0,
      };
    }
  }

  return {
    resumo: Object.values(porProfissional).sort(
      (a, b) => b.totalComissao - a.totalComissao,
    ),
    dataInicio,
    dataFim,
    profissionais,
  };
}
// Compatibilidade com componentes antigos

export const listComandas = getComandas;

export const openComanda = abrirComanda;

export const addServiceItem = addServicoItem;

export const addProductItem = addProdutoItem;

export const closeComanda = fecharComanda;

export const cancelComanda = cancelarComanda;

export const removeComandaItem = removeItem;
// ─────────────────────────────────────────────────────────────
// COMPATIBILIDADE PDV / NOVA COMANDA
// ─────────────────────────────────────────────────────────────

export async function getProfessionalsForComanda() {
  const membership = await requireMembership();

  return db.professional.findMany({
    where: {
      barbershopId: membership.barbershopId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getClientsForComanda(search: string) {
  const membership = await requireMembership();

  return db.client.findMany({
    where: {
      barbershopId: membership.barbershopId,
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
    take: 10,
    orderBy: {
      name: "asc",
    },
  });
}

export async function getServicesForPDV() {
  const membership = await requireMembership();

  return db.service.findMany({
    where: {
      barbershopId: membership.barbershopId,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProductsForPDV() {
  const membership = await requireMembership();

  return db.product.findMany({
    where: {
      barbershopId: membership.barbershopId,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
