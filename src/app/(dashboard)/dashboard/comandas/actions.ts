"use server";

import {
  ComandaStatus,
  MemberRole,
  type PaymentMethod,
  type Prisma,
  StockMovementReason,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { requireMembership, requireRole } from "@/lib/permissions";

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
    items: { include: { combo: { select: { name: true } } } };
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
        include: { combo: { select: { name: true } } },
      },
    },
  });

  if (!comanda) return null;

  // Assinatura ativa do cliente da comanda (se houver) — para o PDV oferecer
  // os serviços cobertos pelo plano e exibir o saldo do ciclo corrente.
  const now = new Date();
  const activeSubscription = comanda.clientId
    ? await db.clientSubscription.findFirst({
        where: {
          clientId: comanda.clientId,
          barbershopId: membership.barbershopId,
          status: "active",
        },
        include: {
          plan: {
            include: {
              items: {
                include: {
                  service: {
                    select: { id: true, name: true, priceInCents: true },
                  },
                },
              },
            },
          },
          usages: {
            where: {
              periodStart: { lte: now },
              periodEnd: { gte: now },
            },
          },
        },
      })
    : null;

  return { ...comanda, activeSubscription };
}

export type ComandaWithSubscription = NonNullable<
  Awaited<ReturnType<typeof getComanda>>
>;

// ─── ABRIR COMANDA ───────────────────────────────────────────────────────────

export async function abrirComanda(data: {
  professionalId: string;
  clientId?: string;
  clientName: string;
  notes?: string;
  appointmentId?: string;
  // serviceId removido: quando appointmentId é fornecido, serviços são buscados
  // diretamente da tabela appointment_services (snapshots já gravados na criação).
}) {
  const membership = await requireMembership();

  if (
    membership.role === MemberRole.barber &&
    membership.professionalId !== data.professionalId
  ) {
    throw new Error("Barbeiro só pode abrir comanda para si mesmo.");
  }

  if (data.appointmentId) {
    const existing = await db.comanda.findFirst({
      where: {
        appointmentId: data.appointmentId,
        barbershopId: membership.barbershopId,
      },
      select: { id: true },
    });
    if (existing) redirect(`/dashboard/comandas/${existing.id}`);
  }

  const baseData = {
    barbershopId: membership.barbershopId,
    professionalId: data.professionalId,
    clientId: data.clientId || null,
    clientName: data.clientName,
    notes: data.notes || null,
    appointmentId: data.appointmentId || null,
    status: ComandaStatus.open,
  };

  // Busca todos os AppointmentService quando há appointmentId — cria um ComandaItem por serviço.
  const appointmentServices = data.appointmentId
    ? await db.appointmentService.findMany({
        where: { appointmentId: data.appointmentId },
      })
    : [];

  const totalInCents = appointmentServices.reduce(
    (sum, s) => sum + s.servicePriceInCents,
    0,
  );

  const comanda =
    appointmentServices.length > 0
      ? await db.$transaction(async (tx) => {
          const created = await tx.comanda.create({
            data: { ...baseData, totalInCents },
          });

          await tx.comandaItem.createMany({
            data: appointmentServices.map((s) => ({
              comandaId: created.id,
              type: "service" as const,
              serviceId: s.serviceId,
              serviceName: s.serviceName,
              servicePrice: s.servicePriceInCents,
              productName: "",
              productPrice: 0,
              quantity: 1,
              unitPriceInCents: s.servicePriceInCents,
              totalInCents: s.servicePriceInCents,
            })),
          });

          return created;
        })
      : await db.comanda.create({
          data: { ...baseData, totalInCents: 0 },
        });

  log.comanda.info("comanda aberta", {
    barbershopId: membership.barbershopId,
    comandaId: comanda.id,
    professionalId: data.professionalId,
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

  const total = product.priceInCents * quantity;

  await db.$transaction(async (tx) => {
    // Atomic decrement: only succeeds if stock is sufficient at commit time
    const stockUpdated = await tx.product.updateMany({
      where: { id: product.id, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } },
    });
    if (stockUpdated.count === 0) {
      throw new Error("Estoque insuficiente.");
    }

    await tx.comandaItem.create({
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
    });

    await tx.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: { increment: total } },
    });
  });

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
  payments: { method: PaymentMethod; amountInCents: number }[],
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
      items: { include: { combo: { select: { commissionPercent: true } } } },
    },
  });

  if (!comanda) throw new Error("Comanda não encontrada ou já fechada.");
  if (!payments.length) throw new Error("Informe ao menos uma forma de pagamento.");

  // Buscar Professional para calcular comissão (campos vivem em Professional)
  const profissional = await db.professional.findFirst({
    where: {
      id: comanda.professionalId,
      barbershopId: comanda.barbershopId,
      isActive: true,
    },
  });

  // Pré-carregar overrides por item (sem N+1 no loop abaixo)
  const serviceOverrides = new Map<string, number>();
  const productOverrides = new Map<string, number>();
  if (profissional) {
    const [svcComms, prodComms] = await Promise.all([
      db.professionalServiceCommission.findMany({
        where: { professionalId: profissional.id },
        select: { serviceId: true, commissionPct: true },
      }),
      db.professionalProductCommission.findMany({
        where: { professionalId: profissional.id },
        select: { productId: true, commissionPct: true },
      }),
    ]);
    svcComms.forEach((c) => serviceOverrides.set(c.serviceId, Number(c.commissionPct)));
    prodComms.forEach((c) => productOverrides.set(c.productId, Number(c.commissionPct)));
  }

  const totalFinal = Math.max(0, comanda.totalInCents - discountInCents);

  const sumPaid = payments.reduce((s, p) => s + p.amountInCents, 0);
  if (sumPaid !== totalFinal) {
    throw new Error(
      `Total pago (R$ ${(sumPaid / 100).toFixed(2)}) não bate com o total da comanda (R$ ${(totalFinal / 100).toFixed(2)}).`,
    );
  }

  const closedAt = new Date();

  await db.$transaction(async (tx) => {
    // 1. Calcular e gravar comissão em cada item
    // Prioridade: override por item > percentual fixo do Professional > null
    for (const item of comanda.items) {
      let pct: number | null = null;
      let value: number | null = null;

      // Camada combo: se o item pertence a um combo com commissionPercent
      // configurado, esse valor tem precedencia sobre override/global do
      // profissional. Sem comboId ou sem commissionPercent => comportamento
      // identico ao atual (override -> global).
      const comboPct =
        item.comboId && item.combo?.commissionPercent != null
          ? item.combo.commissionPercent
          : null;

      if (comboPct != null) {
        pct = comboPct;
        value = Math.round((item.totalInCents * pct) / 100);
      } else if (item.clientSubscriptionId) {
        // Camada plano de assinatura: serviço coberto pela mensalidade.
        // barberCommissionMode "fixed" => valor fixo por atendimento do
        // SubscriptionPlanItem; "none" => sem comissao. Tem precedencia sobre
        // override/global, depois do combo. Mantem pct = null (comissao em valor).
        const planItem = await tx.subscriptionPlanItem.findFirst({
          where: {
            plan: {
              subscriptions: { some: { id: item.clientSubscriptionId } },
            },
            serviceId: item.serviceId ?? undefined,
          },
          select: {
            barberCommissionInCents: true,
            plan: { select: { barberCommissionMode: true } },
          },
        });

        if (planItem) {
          pct = null;
          value =
            planItem.plan.barberCommissionMode === "fixed"
              ? planItem.barberCommissionInCents ?? 0
              : 0;
        }
      } else if (item.type === "service") {
        const override = item.serviceId ? serviceOverrides.get(item.serviceId) : undefined;
        if (override !== undefined) {
          pct = override;
          value = Math.round((item.totalInCents * pct) / 100);
        } else if (
          profissional?.commissionOnServices &&
          profissional.commissionServicePct !== null
        ) {
          pct = Number(profissional.commissionServicePct);
          value = Math.round((item.totalInCents * pct) / 100);
        }
      } else if (item.type === "product") {
        const override = item.productId ? productOverrides.get(item.productId) : undefined;
        if (override !== undefined) {
          pct = override;
          value = Math.round((item.totalInCents * pct) / 100);
        } else if (
          profissional?.commissionOnProducts &&
          profissional.commissionProductPct !== null
        ) {
          pct = Number(profissional.commissionProductPct);
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
      const stockUpdated = await tx.product.updateMany({
        where: { id: item.productId!, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (stockUpdated.count === 0) {
        throw new Error("Estoque insuficiente para fechar a comanda.");
      }
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

    // 3. Fechar a comanda (paymentMethod = método predominante para compat. legado)
    await tx.comanda.update({
      where: { id: comandaId },
      data: {
        status: ComandaStatus.closed,
        paymentMethod: payments[0].method,
        totalInCents: totalFinal,
        closedAt,
      },
    });

    // 4. Gravar registros de split payment
    await tx.comandaPayment.createMany({
      data: payments.map((p) => ({
        comandaId,
        method: p.method,
        amountInCents: p.amountInCents,
      })),
    });

    // 5. Sync: comanda fechada → appointment concluído (apenas se não finalizado)
    if (comanda.appointmentId) {
      await tx.appointment.updateMany({
        where: {
          id: comanda.appointmentId,
          status: { notIn: ["completed", "cancelled"] },
        },
        data: { status: "completed" },
      });
    }

    // 6. CRM: visita real = comanda fechada (fonte de verdade para totalVisits/lastVisitAt)
    if (comanda.clientId) {
      await tx.client.update({
        where: { id: comanda.clientId },
        data: {
          totalVisits: { increment: 1 },
          lastVisitAt: closedAt,
        },
      });
    }
  });

  log.comanda.info("comanda fechada", {
    barbershopId: membership.barbershopId,
    comandaId,
    payments: payments.length,
    totalInCents: totalFinal,
  });

  revalidatePath("/dashboard/agenda");
  revalidatePath(`/dashboard/comandas`);
  revalidatePath(`/dashboard/comandas/${comandaId}`);
  redirect(`/dashboard/comandas`);
}

// ─── REABRIR COMANDA COM PIN ──────────────────────────────────────────────────

export async function reabrirComanda(
  comandaId: string,
  pin: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const membership = await requireRole(["owner", "reception"]);

  const [comanda, barbershop] = await Promise.all([
    db.comanda.findFirst({
      where: { id: comandaId, barbershopId: membership.barbershopId },
      select: { id: true, status: true },
    }),
    db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      select: { reopenPin: true },
    }),
  ]);

  if (!comanda) return { success: false, error: "Comanda não encontrada." };
  if (comanda.status !== ComandaStatus.closed) {
    return { success: false, error: "Apenas comandas fechadas podem ser reabertas." };
  }
  if (!barbershop?.reopenPin) {
    return { success: false, error: "Configure um PIN nas Configurações antes de reabrir comandas." };
  }

  const pinOk = await bcrypt.compare(pin, barbershop.reopenPin);
  if (!pinOk) return { success: false, error: "PIN incorreto." };

  await db.$transaction(async (tx) => {
    await tx.comanda.update({
      where: { id: comandaId },
      data: { status: ComandaStatus.open, closedAt: null },
    });
  });

  log.comanda.info("comanda reaberta", {
    barbershopId: membership.barbershopId,
    comandaId,
  });

  revalidatePath(`/dashboard/comandas/${comandaId}`);
  revalidatePath("/dashboard/comandas");

  return { success: true };
}

// ─── CANCELAR COMANDA ────────────────────────────────────────────────────────

export async function cancelarComanda(comandaId: string) {
  const membership = await requireRole(["owner"]);

  const comanda = await db.comanda.findFirst({
    where: { id: comandaId, barbershopId: membership.barbershopId },
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

    // Sync: comanda cancelada → appointment cancelado (apenas se não finalizado)
    if (comanda.appointmentId) {
      await tx.appointment.updateMany({
        where: {
          id: comanda.appointmentId,
          status: { notIn: ["cancelled", "completed"] },
        },
        data: { status: "cancelled" },
      });
    }
  });

  log.comanda.warn("comanda cancelada", {
    barbershopId: membership.barbershopId,
    comandaId,
    status: comanda.status,
  });

  revalidatePath("/dashboard/agenda");
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

// ─── addComboToComanda ────────────────────────────────────────────────────────
// Explode um combo em ComandaItems individuais, rateando o preco do combo
// proporcionalmente ao preco de lista de cada componente. A soma dos itens
// criados e sempre exatamente igual ao priceInCents do combo.

export async function addComboToComanda(comandaId: string, comboId: string) {
  // Mesma regra das actions addServicoItem/addProdutoItem: requireMembership.
  const membership = await requireMembership();
  const barbershopId = membership.barbershopId;

  // Validar ownership da comanda (mesmo padrao das demais actions de item)
  const comanda = await db.comanda.findFirst({
    where: {
      id: comandaId,
      barbershopId,
      status: ComandaStatus.open,
    },
  });
  if (!comanda) throw new Error("Comanda não encontrada ou já fechada.");

  // Carregar combo com componentes e precos atuais
  const combo = await db.combo.findFirst({
    where: { id: comboId, barbershopId, isActive: true },
    include: {
      items: {
        include: {
          service: { select: { id: true, name: true, priceInCents: true } },
          product: { select: { id: true, name: true, priceInCents: true } },
        },
      },
    },
  });
  if (!combo) throw new Error("Combo não encontrado ou inativo.");
  if (combo.items.length === 0) throw new Error("Combo sem itens válidos.");

  // Calcular preco de lista total
  const listTotal = combo.items.reduce((sum, item) => {
    const price = item.service?.priceInCents ?? item.product?.priceInCents ?? 0;
    return sum + price;
  }, 0);
  if (listTotal <= 0) throw new Error("Combo sem itens válidos para venda.");

  const comboPrice = combo.priceInCents;

  // ── Algoritmo de rateio proporcional ──────────────────────────────────────
  // alloc_i = round(p_i / listTotal * comboPrice)
  // residual somado ao item de maior preco (garante soma exata = comboPrice)
  const allocs = combo.items.map((item) => {
    const p = item.service?.priceInCents ?? item.product?.priceInCents ?? 0;
    return Math.round((p / listTotal) * comboPrice);
  });

  const allocSum = allocs.reduce((a, b) => a + b, 0);
  const residual = comboPrice - allocSum;

  if (residual !== 0) {
    // Somar residual ao item de maior preco (desempate: primeiro)
    let maxIdx = 0;
    let maxPrice = 0;
    combo.items.forEach((item, idx) => {
      const p = item.service?.priceInCents ?? item.product?.priceInCents ?? 0;
      if (p > maxPrice) {
        maxPrice = p;
        maxIdx = idx;
      }
    });
    allocs[maxIdx] += residual;
  }

  // ── Comissao do combo (campo separado, adicional as comissoes por item) ────
  // Se combo.commissionPercent != null: propaga para commissionPct de cada item
  // explodido. O fecharComanda hoje recalcula commissionPct/commissionValue a
  // partir das configuracoes do Professional; a integracao da comissao do combo
  // na engine de fechamento e tratada em etapa posterior. Aqui apenas gravamos.
  const comboCommission =
    combo.commissionPercent != null ? combo.commissionPercent : null;

  await db.$transaction(async (tx) => {
    // Criar um ComandaItem por componente do combo, com preco rateado
    for (let i = 0; i < combo.items.length; i++) {
      const item = combo.items[i];
      const allocatedPrice = allocs[i];
      const isService = item.type === "service";

      await tx.comandaItem.create({
        data: {
          comandaId,
          type: item.type,
          serviceId: isService ? item.serviceId ?? null : null,
          productId: isService ? null : item.productId ?? null,
          serviceName: isService ? item.service?.name ?? "Serviço" : "",
          servicePrice: isService ? allocatedPrice : 0,
          productName: isService ? "" : item.product?.name ?? "Produto",
          productPrice: isService ? 0 : allocatedPrice,
          quantity: 1,
          unitPriceInCents: allocatedPrice,
          totalInCents: allocatedPrice,
          comboId: combo.id,
          ...(comboCommission != null && { commissionPct: comboCommission }),
        },
      });
    }

    // Recalcular total da comanda — mesmo padrao incremental das demais actions.
    // A soma dos itens criados e exatamente comboPrice (rateio garante isso).
    await tx.comanda.update({
      where: { id: comandaId },
      data: { totalInCents: { increment: comboPrice } },
    });
  });

  revalidatePath(`/dashboard/comandas/${comandaId}`);
}

// ---------------------------------------------------------------------------
// addPlanServiceToComanda — lança serviço coberto pelo plano na comanda
// ---------------------------------------------------------------------------

export async function addPlanServiceToComanda(
  comandaId: string,
  subscriptionId: string,
  serviceId: string
) {
  const { barbershopId } = await requireRole(["owner", "reception", "barber"]);

  const now = new Date();

  // Início e fim do ciclo atual (mês corrente, UTC)
  const periodStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1
  ));
  const periodEnd = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
    23, 59, 59, 999
  ));

  const result = await db.$transaction(async (tx) => {
    // 1. Verificar comanda pertence à barbearia e está aberta
    const comanda = await tx.comanda.findFirst({
      where: { id: comandaId, barbershopId, status: "open" },
      select: { id: true, clientId: true },
    });
    if (!comanda) {
      return { error: "Comanda nao encontrada ou ja fechada." };
    }

    // 2. Verificar assinatura ativa pertence ao cliente da comanda
    const subscription = await tx.clientSubscription.findFirst({
      where: {
        id: subscriptionId,
        barbershopId,
        clientId: comanda.clientId ?? undefined,
        status: "active",
      },
      include: {
        plan: {
          include: {
            items: {
              where: { serviceId },
              select: {
                id: true,
                quantityPerCycle: true,
                barberCommissionInCents: true,
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      return { error: "Assinatura ativa nao encontrada para este cliente." };
    }

    const planItem = subscription.plan.items[0];
    if (!planItem) {
      return { error: "Este servico nao esta incluido no plano do cliente." };
    }

    // 3. Verificar saldo do ciclo atual
    const usage = await tx.subscriptionUsage.findFirst({
      where: {
        subscriptionId,
        serviceId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      select: { id: true, usedCount: true },
    });

    const usedCount = usage?.usedCount ?? 0;
    if (usedCount >= planItem.quantityPerCycle) {
      return {
        error: `Cota esgotada para este servico neste ciclo (${usedCount}/${planItem.quantityPerCycle} usados).`,
      };
    }

    // 4. Buscar dados do serviço para o item
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      select: { name: true, priceInCents: true },
    });
    if (!service) {
      return { error: "Servico nao encontrado." };
    }

    // 5. Criar ComandaItem coberto (R$0 para o cliente)
    await tx.comandaItem.create({
      data: {
        comandaId,
        type: "service",
        serviceId,
        serviceName: service.name,
        quantity: 1,
        unitPriceInCents: 0,
        totalInCents: 0,
        clientSubscriptionId: subscriptionId,
        // Comissão será resolvida no fecharComanda (Fase F4)
      },
    });

    // 6. Incrementar SubscriptionUsage (upsert)
    if (usage) {
      await tx.subscriptionUsage.update({
        where: { id: usage.id },
        data: { usedCount: { increment: 1 } },
      });
    } else {
      await tx.subscriptionUsage.create({
        data: {
          subscriptionId,
          serviceId,
          periodStart,
          periodEnd,
          usedCount: 1,
        },
      });
    }

    return { success: true };
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/dashboard/comandas");
  return { success: true };
}
