"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PackageItemInput = {
  serviceId: string;
  quantity?: number;
};

export type PackageFormData = {
  name: string;
  description?: string | null;
  priceInCents: number;
  validityDays?: number | null;
  commissionPercent?: number | null;
  items: PackageItemInput[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Quantidade do item do pacote: inteiro >= 1. Retorna null se invalido.
function normalizePackageQuantity(raw: number | undefined): number | null {
  const value = raw === undefined ? 1 : raw;
  if (!Number.isFinite(value)) return null;
  const int = Math.trunc(value);
  if (int < 1) return null;
  return int;
}

// Valida os campos do pacote. Retorna a mensagem de erro ou null (ok).
// Padrao return {error} do projeto (nunca throw em Server Action).
function validatePackageData(data: PackageFormData): string | null {
  if (!data.name?.trim()) return "Nome do pacote e obrigatorio.";
  if (!data.priceInCents || data.priceInCents <= 0)
    return "Preco do pacote deve ser maior que zero.";
  if (!data.items || data.items.length === 0)
    return "O pacote deve ter ao menos um servico incluido.";

  for (const item of data.items) {
    if (!item.serviceId) return "Servico invalido no pacote.";
    if (normalizePackageQuantity(item.quantity) === null)
      return "Quantidade do servico deve ser no minimo 1.";
  }

  if (
    data.validityDays !== undefined &&
    data.validityDays !== null &&
    (!Number.isFinite(data.validityDays) ||
      Math.trunc(data.validityDays) < 1)
  ) {
    return "Validade (em dias) deve ser um numero inteiro maior que zero.";
  }

  if (
    data.commissionPercent !== undefined &&
    data.commissionPercent !== null &&
    (data.commissionPercent < 0 || data.commissionPercent > 100)
  ) {
    return "Comissao deve estar entre 0 e 100.";
  }

  return null;
}

// ─── getPackagesData ─────────────────────────────────────────────────────────

export async function getPackagesData() {
  const { barbershopId } = await requireRole(["owner"]);

  const [barbershop, packages, services] = await Promise.all([
    db.barbershop.findUnique({
      where: { id: barbershopId },
      select: { slug: true },
    }),
    db.package.findMany({
      where: { barbershopId },
      include: {
        items: {
          include: {
            service: {
              select: { id: true, name: true, priceInCents: true, isActive: true },
            },
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
  ]);

  return { slug: barbershop?.slug ?? "", packages, services };
}

// ─── createPackage ───────────────────────────────────────────────────────────

export async function createPackage(data: PackageFormData) {
  const { barbershopId } = await requireRole(["owner"]);

  const validationError = validatePackageData(data);
  if (validationError) return { error: validationError };

  // Validar ownership de cada servico (nunca confiar em id vindo do client)
  for (const item of data.items) {
    const svc = await db.service.findFirst({
      where: { id: item.serviceId, barbershopId },
      select: { id: true },
    });
    if (!svc) return { error: "Servico nao pertence a esta barbearia." };
  }

  await db.$transaction(async (tx) => {
    const pkg = await tx.package.create({
      data: {
        barbershopId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        priceInCents: data.priceInCents,
        validityDays:
          data.validityDays != null ? Math.trunc(data.validityDays) : null,
        commissionPercent: data.commissionPercent ?? null,
        isActive: true,
      },
    });

    await tx.packageItem.createMany({
      data: data.items.map((item) => ({
        packageId: pkg.id,
        serviceId: item.serviceId,
        quantity: normalizePackageQuantity(item.quantity) ?? 1,
      })),
    });
  });

  revalidatePath("/dashboard/pacotes");
  return { success: true };
}

// ─── updatePackage — substitui os items por completo (delete + recreate) ──────

export async function updatePackage(packageId: string, data: PackageFormData) {
  const { barbershopId } = await requireRole(["owner"]);

  const validationError = validatePackageData(data);
  if (validationError) return { error: validationError };

  const existing = await db.package.findFirst({
    where: { id: packageId, barbershopId },
    select: { id: true },
  });
  if (!existing) return { error: "Pacote nao encontrado." };

  // Validar ownership de cada servico
  for (const item of data.items) {
    const svc = await db.service.findFirst({
      where: { id: item.serviceId, barbershopId },
      select: { id: true },
    });
    if (!svc) return { error: "Servico nao pertence a esta barbearia." };
  }

  await db.$transaction(async (tx) => {
    await tx.package.update({
      where: { id: packageId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        priceInCents: data.priceInCents,
        validityDays:
          data.validityDays != null ? Math.trunc(data.validityDays) : null,
        commissionPercent: data.commissionPercent ?? null,
      },
    });

    // Substituicao completa dos items (mesmo padrao do Combo)
    await tx.packageItem.deleteMany({ where: { packageId } });
    await tx.packageItem.createMany({
      data: data.items.map((item) => ({
        packageId,
        serviceId: item.serviceId,
        quantity: normalizePackageQuantity(item.quantity) ?? 1,
      })),
    });
  });

  revalidatePath("/dashboard/pacotes");
  return { success: true };
}

// ─── togglePackageActive ──────────────────────────────────────────────────────

export async function togglePackageActive(packageId: string) {
  const { barbershopId } = await requireRole(["owner"]);

  const pkg = await db.package.findFirst({
    where: { id: packageId, barbershopId },
    select: { id: true, isActive: true },
  });
  if (!pkg) return { error: "Pacote nao encontrado." };

  await db.package.update({
    where: { id: packageId },
    data: { isActive: !pkg.isActive },
  });

  revalidatePath("/dashboard/pacotes");
  return { success: true };
}

// ─── sellPackageToClient — venda MANUAL (Etapa 3) ─────────────────────────────
// Cria ClientPackage (pending) + ClientPackageItem[] com snapshots. Serve tanto
// a venda presencial quanto a registrar uma venda negociada por fora (WhatsApp).
// Pagamento e sempre um passo separado (markPackagePaid), nunca nasce pago aqui.

export type SellPackageInput = {
  packageId: string;
  clientId: string;
  paymentDueDate?: string | null; // ISO opcional; vendedor pode nao definir
};

export async function sellPackageToClient(input: SellPackageInput) {
  const { barbershopId, professionalId } = await requireRole([
    "owner",
    "reception",
    "barber",
  ]);

  if (!input.packageId) return { error: "Pacote invalido." };
  if (!input.clientId) return { error: "Selecione um cliente." };

  // Data de pagamento opcional
  let paymentDueDate: Date | null = null;
  if (input.paymentDueDate && input.paymentDueDate.trim() !== "") {
    const d = new Date(input.paymentDueDate);
    if (Number.isNaN(d.getTime())) return { error: "Data de pagamento invalida." };
    paymentDueDate = d;
  }

  const result = await db.$transaction(async (tx) => {
    // a) Package ativo + ownership + composicao
    const pkg = await tx.package.findFirst({
      where: { id: input.packageId, barbershopId, isActive: true },
      include: {
        items: { include: { service: { select: { id: true, name: true } } } },
      },
    });
    if (!pkg) return { error: "Pacote nao encontrado ou inativo." };
    if (pkg.items.length === 0) {
      return { error: "Pacote sem servicos configurados." };
    }

    // Cliente deve existir e pertencer a barbearia
    const client = await tx.client.findFirst({
      where: { id: input.clientId, barbershopId },
      select: { id: true },
    });
    if (!client) return { error: "Cliente nao encontrado." };

    // b) expiresAt derivado de validityDays (ou null = sem expiracao)
    const expiresAt =
      pkg.validityDays != null
        ? new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000)
        : null;

    // c) ClientPackage — priceInCents e SNAPSHOT do catalogo no momento da venda
    const clientPackage = await tx.clientPackage.create({
      data: {
        barbershopId,
        clientId: client.id,
        packageId: pkg.id,
        paymentStatus: "pending",
        priceInCents: pkg.priceInCents,
        paymentDueDate,
        expiresAt,
        soldByProfessionalId: professionalId, // pode ser null (ex.: owner sem perfil)
      },
    });

    // d) ClientPackageItem por PackageItem — quantityTotal e serviceName sao snapshots
    await tx.clientPackageItem.createMany({
      data: pkg.items.map((item) => ({
        clientPackageId: clientPackage.id,
        serviceId: item.serviceId,
        serviceName: item.service.name,
        quantityTotal: item.quantity,
        quantityUsed: 0,
      })),
    });

    return { clientPackageId: clientPackage.id };
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/dashboard/pacotes");
  return { success: true, clientPackageId: result.clientPackageId };
}

// ─── markPackagePaid — marca pagamento manual (idempotente) ───────────────────
// updateMany com filtro paymentStatus:"pending" torna a marcacao atomica:
// uma segunda tentativa (ou clique duplo) nao re-marca um pacote ja pago.

export async function markPackagePaid(clientPackageId: string) {
  const { barbershopId } = await requireRole(["owner", "reception", "barber"]);

  const updated = await db.clientPackage.updateMany({
    where: { id: clientPackageId, barbershopId, paymentStatus: "pending" },
    data: { paymentStatus: "paid", paidAt: new Date() },
  });

  if (updated.count === 0) {
    const exists = await db.clientPackage.findFirst({
      where: { id: clientPackageId, barbershopId },
      select: { paymentStatus: true },
    });
    if (!exists) return { error: "Venda de pacote nao encontrada." };
    return { error: "Este pacote ja esta marcado como pago." };
  }

  revalidatePath("/dashboard/pacotes");
  return { success: true };
}

// ─── getClientPackagesForClient — leitura (saldo restante calculado) ──────────
// Uso futuro (Etapa 4 / detalhe do cliente). Saldo restante e derivado
// (quantityTotal - quantityUsed), nunca armazenado.

export async function getClientPackagesForClient(clientId: string) {
  const { barbershopId } = await requireRole(["owner", "reception", "barber"]);

  const clientPackages = await db.clientPackage.findMany({
    where: { barbershopId, clientId },
    include: {
      package: { select: { id: true, name: true } },
      items: {
        include: { service: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return clientPackages.map((cp) => ({
    ...cp,
    items: cp.items.map((item) => ({
      ...item,
      quantityRemaining: Math.max(0, item.quantityTotal - item.quantityUsed),
    })),
  }));
}
