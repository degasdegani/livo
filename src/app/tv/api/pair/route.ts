import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// Rate-limit em memória: 5 tentativas por IP em 15 minutos.
// Mesmo padrão Map<chave, { count, resetAt }> ja usado em api/livia/route.ts.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 },
    );
  }

  let pin: string;
  try {
    const body = await req.json();
    pin = String(body.pin ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN deve ter 6 digitos." }, { status: 400 });
  }

  const barbershop = await db.barbershop.findFirst({
    where: { tvPin: pin },
    select: { id: true },
  });

  if (!barbershop) {
    return NextResponse.json({ error: "PIN invalido." }, { status: 401 });
  }

  const token = crypto.randomBytes(32).toString("hex");

  await db.tvDevice.create({
    data: {
      barbershopId: barbershop.id,
      token,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ token });
}
