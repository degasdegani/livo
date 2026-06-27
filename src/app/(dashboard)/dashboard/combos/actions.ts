"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ComboItemInput = {
  type: "service" | "product";
  serviceId?: string;
  productId?: string;
  quantity?: number;
};

export type ComboFormData = {
  name: string;
  description?: string;
  priceInCents: number;
  commissionPercent?: number;
  items: ComboItemInput[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Quantidade do item de combo: inteiro >= 1. Lanca erro se invalido.
function normalizeComboQuantity(raw: number | undefined): number {
  const value = raw === undefined ? 1 : raw;
  if (!Number.isFinite(value)) throw new Error("Quantidade do item inválida.");
  const int = Math.trunc(value);
  if (int < 1) throw new Error("Quantidade do item deve ser no mínimo 1.");
  return int;
}

function validateComboData(data: ComboFormData) {
  if (!data.name?.trim()) throw new Error("Nome do combo é obrigatório.");
  if (!data.items || data.items.length === 0)
    throw new Error("O combo deve ter pelo menos 1 item.");
  if (!data.priceInCents || data.priceInCents <= 0)
    throw new Error("Preço do combo deve ser maior que zero.");
  if (
    data.commissionPercent !== undefined &&
    data.commissionPercent !== null &&
    (data.commissionPercent < 0 || data.commissionPercent > 100)
  )
    throw new Error("Comissão deve estar entre 0 e 100.");
}

// ─── getCombosData ────────────────────────────────────────────────────────────

export async function getCombosData() {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  const [combos, services, products] = await Promise.all([
    db.combo.findMany({
      where: { barbershopId },
      include: {
        items: {
          include: {
            service: { select: { id: true, name: true, priceInCents: true, isActive: true } },
            product: { select: { id: true, name: true, priceInCents: true, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.service.findMany({
      where: { barbershopId, isActive: true },
      select: { id: true, name: true, priceInCents: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { barbershopId, isActive: true },
      select: { id: true, name: true, priceInCents: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { combos, services, products };
}

// ─── createCombo ─────────────────────────────────────────────────────────────

export async function createCombo(data: ComboFormData) {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  validateComboData(data);

  // Validar ownership de cada componente
  for (const item of data.items) {
    if (item.type === "service" && item.serviceId) {
      const svc = await db.service.findFirst({
        where: { id: item.serviceId, barbershopId },
      });
      if (!svc) throw new Error("Serviço não pertence a esta barbearia.");
    }
    if (item.type === "product" && item.productId) {
      const prd = await db.product.findFirst({
        where: { id: item.productId, barbershopId },
      });
      if (!prd) throw new Error("Produto não pertence a esta barbearia.");
    }
  }

  await db.$transaction(async (tx) => {
    const combo = await tx.combo.create({
      data: {
        barbershopId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        priceInCents: data.priceInCents,
        commissionPercent: data.commissionPercent ?? null,
        isActive: true,
      },
    });

    await tx.comboItem.createMany({
      data: data.items.map((item) => ({
        comboId: combo.id,
        type: item.type,
        serviceId: item.serviceId ?? null,
        productId: item.productId ?? null,
        quantity: normalizeComboQuantity(item.quantity),
      })),
    });
  });

  revalidatePath("/dashboard/combos");
}

// ─── updateCombo ─────────────────────────────────────────────────────────────

export async function updateCombo(comboId: string, data: ComboFormData) {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  validateComboData(data);

  const existing = await db.combo.findFirst({
    where: { id: comboId, barbershopId },
  });
  if (!existing) throw new Error("Combo não encontrado.");

  // Validar ownership de cada componente
  for (const item of data.items) {
    if (item.type === "service" && item.serviceId) {
      const svc = await db.service.findFirst({
        where: { id: item.serviceId, barbershopId },
      });
      if (!svc) throw new Error("Serviço não pertence a esta barbearia.");
    }
    if (item.type === "product" && item.productId) {
      const prd = await db.product.findFirst({
        where: { id: item.productId, barbershopId },
      });
      if (!prd) throw new Error("Produto não pertence a esta barbearia.");
    }
  }

  await db.$transaction(async (tx) => {
    await tx.comboItem.deleteMany({ where: { comboId } });

    await tx.combo.update({
      where: { id: comboId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        priceInCents: data.priceInCents,
        commissionPercent: data.commissionPercent ?? null,
      },
    });

    await tx.comboItem.createMany({
      data: data.items.map((item) => ({
        comboId,
        type: item.type,
        serviceId: item.serviceId ?? null,
        productId: item.productId ?? null,
        quantity: normalizeComboQuantity(item.quantity),
      })),
    });
  });

  revalidatePath("/dashboard/combos");
}

// ─── toggleComboActive ────────────────────────────────────────────────────────

export async function toggleComboActive(comboId: string) {
  const membership = await requireRole(["owner"]);
  const barbershopId = membership.barbershopId;

  const combo = await db.combo.findFirst({
    where: { id: comboId, barbershopId },
  });
  if (!combo) throw new Error("Combo não encontrado.");

  await db.combo.update({
    where: { id: comboId },
    data: { isActive: !combo.isActive },
  });

  revalidatePath("/dashboard/combos");
}

// ─── getCombosAtivos (seletor do PDV) ─────────────────────────────────────────
// Leitura para o seletor de combos na comanda. Mesma permissao de
// addComboToComanda (requireMembership): qualquer role pode ver os combos.

export async function getCombosAtivos(comandaId: string) {
  const membership = await requireMembership();
  const barbershopId = membership.barbershopId;

  // Validar que a comanda pertence a barbearia
  const comanda = await db.comanda.findFirst({
    where: { id: comandaId, barbershopId },
    select: { id: true },
  });
  if (!comanda) throw new Error("Comanda não encontrada.");

  return db.combo.findMany({
    where: { barbershopId, isActive: true },
    include: {
      items: {
        include: {
          service: { select: { priceInCents: true } },
          product: { select: { priceInCents: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}
