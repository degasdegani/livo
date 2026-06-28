"use server";

import { db } from "@/lib/db";
import { requireMembership, requireRole } from "@/lib/permissions";
import { StockMovementReason } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── TIPOS PÚBLICOS ────────────────────────────────────────────────────────

export type ProductWithCategory = {
  id: string;
  name: string;
  description: string | null;
  costInCents: number;
  priceInCents: number;
  stockQuantity: number;
  minStockAlert: number;
  isActive: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryWithCount = {
  id: string;
  name: string;
  _count: { products: number };
};

export type StockMovementWithProduct = {
  id: string;
  quantity: number;
  reason: StockMovementReason;
  notes: string | null;
  createdAt: Date;
  product: { id: string; name: string };
};

// ─── CATEGORIAS ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryWithCount[]> {
  const membership = await requireMembership();
  return db.productCategory.findMany({
    where: { barbershopId: membership.barbershopId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(name: string) {
  const membership = await requireRole(["owner", "reception"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da categoria é obrigatório.");

  await db.productCategory.create({
    data: { name: trimmed, barbershopId: membership.barbershopId },
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

export async function updateCategory(id: string, name: string) {
  const membership = await requireRole(["owner", "reception"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da categoria é obrigatório.");

  await db.productCategory.updateMany({
    where: { id, barbershopId: membership.barbershopId },
    data: { name: trimmed },
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const membership = await requireRole("owner");

  // Desvincula produtos dessa categoria antes de deletar
  await db.product.updateMany({
    where: { categoryId: id, barbershopId: membership.barbershopId },
    data: { categoryId: null },
  });

  await db.productCategory.deleteMany({
    where: { id, barbershopId: membership.barbershopId },
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

// ─── PRODUTOS ──────────────────────────────────────────────────────────────

export async function getProducts(): Promise<ProductWithCategory[]> {
  const membership = await requireMembership();
  return db.product.findMany({
    where: { barbershopId: membership.barbershopId },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

type CreateProductInput = {
  name: string;
  description?: string;
  costInCents: number;
  priceInCents: number;
  stockQuantity: number;
  minStockAlert: number;
  categoryId?: string;
};

export async function createProduct(input: CreateProductInput) {
  const membership = await requireRole(["owner", "reception"]);
  const name = input.name.trim();
  if (!name) throw new Error("Nome do produto é obrigatório.");
  if (input.priceInCents < 0) throw new Error("Preço não pode ser negativo.");
  if (input.stockQuantity < 0)
    throw new Error("Estoque não pode ser negativo.");

  const product = await db.product.create({
    data: {
      name,
      description: input.description?.trim() || null,
      costInCents: input.costInCents,
      priceInCents: input.priceInCents,
      stockQuantity: input.stockQuantity,
      minStockAlert: input.minStockAlert,
      barbershopId: membership.barbershopId,
      categoryId: input.categoryId || null,
    },
  });

  // Registra movimentação inicial se veio com estoque
  if (input.stockQuantity > 0) {
    await db.stockMovement.create({
      data: {
        quantity: input.stockQuantity,
        reason: "purchase",
        notes: "Estoque inicial ao cadastrar produto",
        productId: product.id,
        barbershopId: membership.barbershopId,
      },
    });
  }

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

type UpdateProductInput = {
  id: string;
  name: string;
  description?: string;
  costInCents: number;
  priceInCents: number;
  minStockAlert: number;
  isActive: boolean;
  categoryId?: string;
};

export async function updateProduct(input: UpdateProductInput) {
  const membership = await requireRole(["owner", "reception"]);
  const name = input.name.trim();
  if (!name) throw new Error("Nome do produto é obrigatório.");

  await db.product.updateMany({
    where: { id: input.id, barbershopId: membership.barbershopId },
    data: {
      name,
      description: input.description?.trim() || null,
      costInCents: input.costInCents,
      priceInCents: input.priceInCents,
      minStockAlert: input.minStockAlert,
      isActive: input.isActive,
      categoryId: input.categoryId || null,
    },
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

export async function toggleProductActive(id: string, isActive: boolean) {
  const membership = await requireRole(["owner", "reception"]);

  await db.product.updateMany({
    where: { id, barbershopId: membership.barbershopId },
    data: { isActive },
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

// ─── MOVIMENTAÇÕES DE ESTOQUE ──────────────────────────────────────────────

type AddStockInput = {
  productId: string;
  quantity: number;
  reason: StockMovementReason;
  notes?: string;
};

export async function addStockMovement(input: AddStockInput) {
  const membership = await requireRole(["owner", "reception"]);
  if (input.quantity === 0) throw new Error("Quantidade não pode ser zero.");

  // Garante que o produto pertence à barbearia
  const product = await db.product.findFirst({
    where: { id: input.productId, barbershopId: membership.barbershopId },
    select: { id: true },
  });
  if (!product) throw new Error("Produto não encontrado.");

  await db.$transaction(async (tx) => {
    // Ajuste atômico do estoque (evita TOCTOU com vendas concorrentes).
    // input.quantity é sinalizado: positivo = entrada, negativo = saída.
    if (input.quantity > 0) {
      await tx.product.update({
        where: { id: input.productId, barbershopId: membership.barbershopId },
        data: { stockQuantity: { increment: input.quantity } },
      });
    } else {
      const saida = Math.abs(input.quantity);
      const stockUpdated = await tx.product.updateMany({
        where: {
          id: input.productId,
          barbershopId: membership.barbershopId,
          stockQuantity: { gte: saida },
        },
        data: { stockQuantity: { decrement: saida } },
      });
      if (stockUpdated.count === 0) {
        throw new Error("Estoque insuficiente para o ajuste.");
      }
    }

    await tx.stockMovement.create({
      data: {
        quantity: input.quantity,
        reason: input.reason,
        notes: input.notes?.trim() || null,
        productId: input.productId,
        barbershopId: membership.barbershopId,
      },
    });
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true };
}

export async function getStockMovements(
  productId: string,
): Promise<StockMovementWithProduct[]> {
  const membership = await requireMembership();

  // Garante que o produto pertence à barbearia
  const product = await db.product.findFirst({
    where: { id: productId, barbershopId: membership.barbershopId },
  });
  if (!product) throw new Error("Produto não encontrado.");

  return db.stockMovement.findMany({
    where: { productId },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
