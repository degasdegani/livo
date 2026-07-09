"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

interface LeadData {
  name: string;
  whatsapp: string;
  email: string;
  barbershopName?: string;
}

// Mesmo padrão de src/app/[slug]/book/actions.ts.
async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  } catch {
    // headers() indisponível fora de contexto Next.js (ex: testes)
  }
  return "unknown";
}

export async function createLead(
  data: LeadData,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const ip = await getClientIp();
    const { success: allowed } = await checkRateLimit(`vip:${ip}`, 3, 3600);
    if (!allowed) {
      return { error: "Muitas tentativas. Tente novamente mais tarde." };
    }

    const name = data.name?.trim();
    // WhatsApp persistido como dígitos (o PhoneInput já envia dígitos).
    const whatsapp = (data.whatsapp ?? "").replace(/\D/g, "");
    const email = data.email?.trim().toLowerCase();

    if (!name || name.length < 2)
      return { error: "Informe seu nome completo." };
    if (!whatsapp || whatsapp.length < 10)
      return { error: "Informe um WhatsApp válido." };
    if (!email || !email.includes("@"))
      return { error: "Informe um e-mail válido." };

    const existing = await db.waitlistLead.findFirst({ where: { email } });
    if (existing) return { success: true };

    await db.waitlistLead.create({
      data: {
        name,
        whatsapp,
        email,
        barbershopName: data.barbershopName?.trim() || null,
        source: "workshop-tx",
      },
    });

    log.lead.info("novo lead capturado", {
      email,
      barbershopName: data.barbershopName ?? undefined,
    });

    return { success: true };
  } catch (err) {
    log.lead.error("erro ao criar lead", { email: data.email }, err);
    return { error: "Algo deu errado. Tente de novo." };
  }
}
