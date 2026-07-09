"use server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import {
  checkOtpRateLimit,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  sendOtpSms,
} from "@/lib/otp-clube";
import { captureEvent } from "@/lib/posthog";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  createAsaasCustomer,
  createAsaasRecurringSubscription,
  cancelAsaasSubscription,
} from "@/lib/asaas-clube";

const SESSION_COOKIE = "livo_club_session";
const SESSION_TTL_DAYS = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 10;

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? process.env.JWT_SECRET ?? "";
  if (!secret) throw new Error("JWT secret não configurado.");
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// getClientSession — ler sessão do cliente logado
// ---------------------------------------------------------------------------

export type ClientSession = {
  clientId: string;
  barbershopId: string;
  phone: string;
};

export async function getClientSession(
  barbershopId: string
): Promise<ClientSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecret());

    if (
      typeof payload.clientId !== "string" ||
      typeof payload.barbershopId !== "string" ||
      typeof payload.phone !== "string" ||
      payload.barbershopId !== barbershopId
    ) {
      return null;
    }

    return {
      clientId: payload.clientId,
      barbershopId: payload.barbershopId,
      phone: payload.phone,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// requestClientCode — pedir código OTP
// ---------------------------------------------------------------------------

export async function requestClientCode(
  barbershopId: string,
  phone: string
) {
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    return { error: "Telefone invalido. Digite DDD + número." };
  }

  // Verificar que a barbearia existe e está com clube habilitado
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { clubEnabled: true },
  });
  if (!barbershop?.clubEnabled) {
    return { error: "Clube nao disponivel." };
  }

  // Rate limit
  const rl = checkOtpRateLimit(barbershopId, phoneDigits);
  if (!rl.allowed) {
    const minutes = Math.ceil((rl.retryAfterMs ?? 0) / 60000);
    return { error: `Muitas tentativas. Aguarde ${minutes} minuto(s).` };
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.clientVerificationCode.create({
    data: {
      barbershopId,
      phone: phoneDigits,
      codeHash,
      expiresAt,
    },
  });

  const smsResult = await sendOtpSms(phoneDigits, code);
  if (!smsResult.success) {
    return { error: smsResult.error ?? "Erro ao enviar código." };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// verifyClientCode — confirmar código OTP e emitir sessão
// ---------------------------------------------------------------------------

export async function verifyClientCode(
  barbershopId: string,
  phone: string,
  code: string
) {
  const phoneDigits = phone.replace(/\D/g, "");
  const now = new Date();

  const verification = await db.clientVerificationCode.findFirst({
    where: {
      barbershopId,
      phone: phoneDigits,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    return { error: "Código expirado ou inválido. Solicite um novo." };
  }

  if (verification.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { error: "Muitas tentativas incorretas. Solicite um novo código." };
  }

  // Incrementar tentativas
  await db.clientVerificationCode.update({
    where: { id: verification.id },
    data: { attempts: { increment: 1 } },
  });

  if (!verifyOtpCode(code.trim(), verification.codeHash)) {
    return { error: "Código incorreto." };
  }

  // Marcar como consumido
  await db.clientVerificationCode.update({
    where: { id: verification.id },
    data: { consumedAt: now },
  });

  // Achar ou criar cliente por (phone, barbershopId)
  let client = await db.client.findFirst({
    where: { phone: phoneDigits, barbershopId },
    select: { id: true },
  });

  if (!client) {
    client = await db.client.create({
      data: {
        phone: phoneDigits,
        barbershopId,
        name: phoneDigits, // placeholder — cliente atualiza depois
      },
      select: { id: true },
    });

    try {
      captureEvent(barbershopId, "cliente_criado", barbershopId, {
        source: "clube_publico",
      });
    } catch (err) {
      log.error("falha ao registrar evento de analytics (cliente_criado)", {
        barbershopId,
      }, err);
    }
  }

  // Emitir JWT de sessão (cookie httpOnly, 60 dias)
  const secret = getJwtSecret();
  const token = await new SignJWT({
    clientId: client.id,
    barbershopId,
    phone: phoneDigits,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .setIssuedAt()
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return { success: true, clientId: client.id };
}

// ---------------------------------------------------------------------------
// logoutClient — limpar sessão
// ---------------------------------------------------------------------------

export async function logoutClient() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true };
}

// ---------------------------------------------------------------------------
// getClubPageData — dados públicos da página do clube (sem login)
// ---------------------------------------------------------------------------

export async function getClubPageData(barbershopId: string) {
  const plans = await db.subscriptionPlan.findMany({
    where: { barbershopId, isActive: true },
    include: {
      items: {
        include: { service: { select: { name: true, priceInCents: true } } },
      },
      productDiscounts: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { priceInCents: "asc" },
  });
  return { plans };
}

// ---------------------------------------------------------------------------
// getClientArea — dados da área logada do assinante
// ---------------------------------------------------------------------------

export async function getClientArea(barbershopId: string) {
  const session = await getClientSession(barbershopId);
  if (!session) return { session: null, subscription: null };

  const subscription = await db.clientSubscription.findFirst({
    where: {
      clientId: session.clientId,
      barbershopId,
      status: { in: ["active", "pending", "suspended"] },
    },
    include: {
      plan: {
        include: {
          items: {
            include: {
              service: { select: { name: true, priceInCents: true } },
            },
          },
        },
      },
      usages: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { session, subscription };
}

// ---------------------------------------------------------------------------
// cancelClientSubscription — cancelamento self-service
// ---------------------------------------------------------------------------

export async function cancelClientSubscription(subscriptionId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("livo_club_session")?.value;
  if (!token) return { error: "Nao autorizado." };

  const subscription = await db.clientSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      clientId: true,
      barbershopId: true,
      asaasSubscriptionId: true,
      status: true,
      currentPeriodEnd: true,
    },
  });

  if (!subscription) return { error: "Assinatura nao encontrada." };

  // Verificar que o cookie pertence a este cliente
  const { jwtVerify } = await import("jose");
  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET ?? process.env.JWT_SECRET ?? ""
  );
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.clientId !== subscription.clientId) {
      return { error: "Nao autorizado." };
    }
  } catch {
    return { error: "Sessao invalida." };
  }

  if (subscription.status === "cancelled") {
    return { error: "Assinatura ja cancelada." };
  }

  // Cancelar no Asaas se tiver asaasSubscriptionId
  if (subscription.asaasSubscriptionId) {
    const barbershop = await db.barbershop.findUnique({
      where: { id: subscription.barbershopId },
      select: { clubAsaasWalletId: true },
    });

    if (barbershop?.clubAsaasWalletId) {
      const { cancelAsaasSubscription } = await import("@/lib/asaas-clube");
      const result = await cancelAsaasSubscription(
        barbershop.clubAsaasWalletId,
        subscription.asaasSubscriptionId
      );
      if (!result.success) {
        return { error: result.error };
      }
    }
  }

  // Marcar como cancelled — acesso permanece até currentPeriodEnd
  await db.clientSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });

  return { success: true, accessUntil: subscription.currentPeriodEnd };
}

// ---------------------------------------------------------------------------
// createClientSubscription — cria assinatura pending + checkout Asaas
// ---------------------------------------------------------------------------

export async function createClientSubscription(
  barbershopId: string,
  planId: string
) {
  // Verificar sessão
  const session = await getClientSession(barbershopId);
  if (!session) return { error: "Nao autorizado. Faca login primeiro." };

  // Verificar clube habilitado
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: {
      clubEnabled: true,
      clubAsaasWalletId: true,
      name: true,
    },
  });

  if (!barbershop?.clubEnabled) return { error: "Clube nao disponivel." };
  if (!barbershop.clubAsaasWalletId) {
    return { error: "Conta de pagamento da barbearia nao configurada." };
  }

  // Verificar plano
  const plan = await db.subscriptionPlan.findFirst({
    where: { id: planId, barbershopId, isActive: true },
    select: { id: true, name: true, priceInCents: true },
  });
  if (!plan) return { error: "Plano nao encontrado." };

  // Verificar se cliente já tem assinatura ativa ou pendente
  const existing = await db.clientSubscription.findFirst({
    where: {
      clientId: session.clientId,
      barbershopId,
      status: { in: ["active", "pending"] },
    },
  });
  if (existing) return { error: "Voce ja possui uma assinatura ativa." };

  // Buscar dados do cliente
  const client = await db.client.findUnique({
    where: { id: session.clientId },
    select: { id: true, name: true, phone: true },
  });
  if (!client) return { error: "Cliente nao encontrado." };

  // Criar customer no Asaas (na subconta da barbearia)
  const customerResult = await createAsaasCustomer({
    name: client.name,
    phone: client.phone,
    walletId: barbershop.clubAsaasWalletId,
  });
  if (!customerResult.success) return { error: customerResult.error };

  // Criar ClientSubscription pending no banco
  const subscription = await db.clientSubscription.create({
    data: {
      barbershopId,
      clientId: session.clientId,
      planId: plan.id,
      status: "pending",
    },
    select: { id: true },
  });

  // Criar assinatura recorrente no Asaas
  const asaasResult = await createAsaasRecurringSubscription({
    walletId: barbershop.clubAsaasWalletId,
    asaasCustomerId: customerResult.asaasCustomerId,
    priceInCents: plan.priceInCents,
    planName: plan.name,
  });

  if (!asaasResult.success) {
    // Limpar subscription pending criada
    await db.clientSubscription.delete({ where: { id: subscription.id } });
    return { error: asaasResult.error };
  }

  // Salvar asaasSubscriptionId com proteção contra duplicata (lição P1-B)
  const updated = await db.clientSubscription.updateMany({
    where: { id: subscription.id, asaasSubscriptionId: null },
    data: { asaasSubscriptionId: asaasResult.asaasSubscriptionId },
  });

  if (updated.count === 0) {
    // Race condition — cancelar a subscription recém-criada no Asaas
    await cancelAsaasSubscription(
      barbershop.clubAsaasWalletId,
      asaasResult.asaasSubscriptionId
    );
    return { error: "Erro de concorrencia. Tente novamente." };
  }

  return {
    success: true,
    checkoutUrl: asaasResult.checkoutUrl,
    subscriptionId: subscription.id,
  };
}
