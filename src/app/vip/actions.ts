"use server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";

interface LeadData {
  name: string;
  whatsapp: string;
  email: string;
  barbershopName?: string;
}

export async function createLead(
  data: LeadData,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const name = data.name?.trim();
    const whatsapp = data.whatsapp?.trim();
    const email = data.email?.trim().toLowerCase();

    if (!name || name.length < 2)
      return { error: "Informe seu nome completo." };
    if (!whatsapp || whatsapp.replace(/\D/g, "").length < 10)
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
