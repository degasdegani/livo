"use server";

import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import {
  ComandaItemType,
  ComandaStatus,
  PaymentMethod,
  StockMovementReason,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

export type ComandaWithItems = Awaited<ReturnType<typeof getComanda>>;
export type ComandaListItem = Awaited<ReturnType<typeof listComandas>>[number];

// ─── Listar comandas ─────────────────────────────────────────────────────────

export async function listComandas(
  filter: "all" | "open" | "closed" | "today" = "open",
) {
  const membership = await requireMembership();

  const where: Record<string, unknown> = {
    barbershopId: membership.barbershopId,
  };

  // RBAC: barber vê apenas suas próprias comandas
  if (membership.role === "barber" && membership.professionalId) {
    where.professionalId = membership.professionalId;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  if (filter === "open") {
    where.status = ComandaStatus.open;
  } else if (filter === "closed") {
    where.status = ComandaStatus.closed;
  } else if (filter === "today") {
    where.openedAt = { gte: startOfDay, lt: endOfDay };
  }

  return db.comanda.findMany({
    where,
    include: {
      professional: { select: { id: true, name: true } },
      items: { select: { id: true, totalInCents: true, type: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { openedAt: "desc" },
  });
}

// ─── Buscar comanda por ID ────────────────────────────────────────────────────

export async function getComanda(comandaId: string) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
    },
    include: {
      professional: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, phone: true } },
      appointment: { select: { id: true, date: true } },
      items: {
        orderBy: { comanda: { createdAt: "asc" } },
        include: {
          service: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, stockQuantity: true } },
        },
      },
    },
  });

  if (!comanda) return null;

  // RBAC: barber só acessa suas próprias
  if (
    membership.role === "barber" &&
    membership.professionalId &&
    comanda.professionalId !== membership.professionalId
  ) {
    return null;
  }

  return comanda;
}

// ─── Abrir nova comanda ───────────────────────────────────────────────────────

export async function openComanda(data: {
  professionalId: string;
  clientId?: string;
  clientName?: string;
  appointmentId?: string;
  notes?: string;
}) {
  const membership = await requireMembership();

  // barber só pode abrir para si mesmo
  if (membership.role === "barber" && membership.professionalId) {
    if (data.professionalId !== membership.professionalId) {
      return { error: "Você só pode abrir comandas para si mesmo." };
    }
  }

  // Verificar se o profissional pertence à barbearia
  const professional = await db.professional.findFirst({
    where: { id: data.professionalId, barbershopId: membership.barbershopId },
  });

  if (!professional) {
    return { error: "Profissional não encontrado." };
  }

  // Se veio appointmentId, verificar se já tem comanda aberta para ele
  if (data.appointmentId) {
    const existing = await db.comanda.findUnique({
      where: { appointmentId: data.appointmentId },
    });
    if (existing) {
      return {
        error: "Já existe uma comanda para este agendamento.",
        comandaId: existing.id,
      };
    }
  }

  const comanda = await db.comanda.create({
    data: {
      barbershopId: membership.barbershopId,
      professionalId: data.professionalId,
      clientId: data.clientId || null,
      clientName: data.clientName || "",
      appointmentId: data.appointmentId || null,
      notes: data.notes || null,
      status: ComandaStatus.open,
      openedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/comandas");
  return { success: true, comandaId: comanda.id };
}

// ─── Adicionar item de serviço ────────────────────────────────────────────────

export async function addServiceItem(comandaId: string, serviceId: string) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: ComandaStatus.open,
    },
  });

  if (!comanda) return { error: "Comanda não encontrada ou não está aberta." };

  if (membership.role === "barber" && membership.professionalId) {
    if (comanda.professionalId !== membership.professionalId) {
      return { error: "Sem permissão." };
    }
  }

  const service = await db.service.findFirst({
    where: { id: serviceId, barbershopId: membership.barbershopId },
  });

  if (!service) return { error: "Serviço não encontrado." };

  await db.$transaction(async (tx) => {
    await tx.comandaItem.create({
      data: {
        comandaId,
        type: ComandaItemType.service,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.priceInCents,
        quantity: 1,
        unitPriceInCents: service.priceInCents,
        totalInCents: service.priceInCents,
      },
    });

    // Recalcular total da comanda
    const items = await tx.comandaItem.findMany({ where: { comandaId } });
    const total = items.reduce((sum, item) => sum + item.totalInCents, 0);
    await tx.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: total },
    });
  });

  revalidatePath(`/dashboard/comandas/${comandaId}`);
  return { success: true };
}

// ─── Adicionar item de produto ────────────────────────────────────────────────

export async function addProductItem(
  comandaId: string,
  productId: string,
  quantity: number = 1,
) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: ComandaStatus.open,
    },
  });

  if (!comanda) return { error: "Comanda não encontrada ou não está aberta." };

  if (membership.role === "barber" && membership.professionalId) {
    if (comanda.professionalId !== membership.professionalId) {
      return { error: "Sem permissão." };
    }
  }

  const product = await db.product.findFirst({
    where: {
      id: productId,
      barbershopId: membership.barbershopId,
      isActive: true,
    },
  });

  if (!product) return { error: "Produto não encontrado." };

  // Verificar estoque disponível
  // Considera itens já adicionados em outras comandas abertas? Não — simplificamos:
  // reserva só acontece no fechamento. Estoque negativo é bloqueado no fechamento.
  if (product.stockQuantity < quantity) {
    return {
      error: `Estoque insuficiente. Disponível: ${product.stockQuantity} unidade(s).`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.comandaItem.create({
      data: {
        comandaId,
        type: ComandaItemType.product,
        productId: product.id,
        productName: product.name,
        productPrice: product.priceInCents,
        quantity,
        unitPriceInCents: product.priceInCents,
        totalInCents: product.priceInCents * quantity,
      },
    });

    // Recalcular total
    const items = await tx.comandaItem.findMany({ where: { comandaId } });
    const total = items.reduce((sum, item) => sum + item.totalInCents, 0);
    await tx.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: total },
    });
  });

  revalidatePath(`/dashboard/comandas/${comandaId}`);
  return { success: true };
}

// ─── Remover item da comanda ──────────────────────────────────────────────────

export async function removeComandaItem(comandaId: string, itemId: string) {
  const membership = await requireMembership();

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: ComandaStatus.open,
    },
  });

  if (!comanda) return { error: "Comanda não está aberta." };

  if (membership.role === "barber" && membership.professionalId) {
    if (comanda.professionalId !== membership.professionalId) {
      return { error: "Sem permissão." };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.comandaItem.delete({ where: { id: itemId } });

    // Recalcular total
    const items = await tx.comandaItem.findMany({ where: { comandaId } });
    const total = items.reduce((sum, item) => sum + item.totalInCents, 0);
    await tx.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: total },
    });
  });

  revalidatePath(`/dashboard/comandas/${comandaId}`);
  return { success: true };
}

// ─── Fechar comanda ───────────────────────────────────────────────────────────

export async function closeComanda(
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
    include: {
      items: true,
    },
  });

  if (!comanda) return { error: "Comanda não encontrada ou não está aberta." };

  if (comanda.items.length === 0) {
    return { error: "Não é possível fechar uma comanda sem itens." };
  }

  // Barber só fecha suas próprias comandas
  if (membership.role === "barber" && membership.professionalId) {
    if (comanda.professionalId !== membership.professionalId) {
      return { error: "Sem permissão." };
    }
  }

  // Verificar estoque de todos os produtos antes de fechar
  const productItems = comanda.items.filter(
    (item) => item.type === ComandaItemType.product,
  );
  for (const item of productItems) {
    if (!item.productId) continue;
    const product = await db.product.findUnique({
      where: { id: item.productId },
    });
    if (!product)
      return { error: `Produto ${item.productName} não encontrado.` };
    if (product.stockQuantity < item.quantity) {
      return {
        error: `Estoque insuficiente para "${item.productName}". Disponível: ${product.stockQuantity}, necessário: ${item.quantity}.`,
      };
    }
  }

  const totalBruto = comanda.items.reduce(
    (sum, item) => sum + item.totalInCents,
    0,
  );
  const totalLiquido = Math.max(0, totalBruto - discountInCents);

  try {
    await db.$transaction(async (tx) => {
      // 1. Fechar a comanda
      await tx.comanda.update({
        where: { id: comandaId },
        data: {
          status: ComandaStatus.closed,
          paymentMethod,
          totalInCents: totalLiquido,
          closedAt: new Date(),
        },
      });

      // 2. Baixar estoque de produtos
      for (const item of productItems) {
        if (!item.productId) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            barbershopId: membership.barbershopId,
            quantity: -item.quantity, // negativo = saída
            reason: StockMovementReason.comanda_use,
            notes: `Comanda #${comandaId.slice(-6).toUpperCase()}`,
          },
        });
      }
    });

    revalidatePath("/dashboard/comandas");
    revalidatePath(`/dashboard/comandas/${comandaId}`);
    revalidatePath("/dashboard/produtos");
    return { success: true };
  } catch (err) {
    console.error("Erro ao fechar comanda:", err);
    return { error: "Erro ao fechar comanda. Tente novamente." };
  }
}

// ─── Cancelar comanda ─────────────────────────────────────────────────────────

export async function cancelComanda(comandaId: string) {
  const membership = await requireRole(["owner", "reception"]);

  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId: membership.barbershopId,
      status: { in: [ComandaStatus.open, ComandaStatus.closed] },
    },
    include: { items: true },
  });

  if (!comanda) return { error: "Comanda não encontrada." };

  await db.$transaction(async (tx) => {
    // Se estava fechada, devolver estoque
    if (comanda.status === ComandaStatus.closed) {
      const productItems = comanda.items.filter(
        (i) => i.type === ComandaItemType.product,
      );
      for (const item of productItems) {
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            barbershopId: membership.barbershopId,
            quantity: item.quantity, // positivo = entrada (devolução)
            reason: StockMovementReason.return,
            notes: `Cancelamento comanda #${comandaId.slice(-6).toUpperCase()}`,
          },
        });
      }
    }

    await tx.comanda.update({
      where: { id: comandaId },
      data: { status: ComandaStatus.cancelled },
    });
  });

  revalidatePath("/dashboard/comandas");
  revalidatePath(`/dashboard/comandas/${comandaId}`);
  revalidatePath("/dashboard/produtos");
  return { success: true };
}

// ─── Buscar serviços e produtos para o PDV ────────────────────────────────────

export async function getServicesForPDV() {
  const membership = await requireMembership();
  return db.service.findMany({
    where: { barbershopId: membership.barbershopId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getProductsForPDV() {
  const membership = await requireMembership();
  return db.product.findMany({
    where: { barbershopId: membership.barbershopId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getProfessionalsForComanda() {
  const membership = await requireMembership();
  return db.professional.findMany({
    where: { barbershopId: membership.barbershopId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getClientsForComanda(search: string) {
  const membership = await requireMembership();
  if (!search || search.length < 2) return [];
  return db.client.findMany({
    where: {
      barbershopId: membership.barbershopId,
      bloqueado: false,
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    },
    select: { id: true, name: true, phone: true },
    take: 10,
  });
}
