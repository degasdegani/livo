"use server";

import { db } from "@/lib/db";

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

    // Evita duplicado (mesma pessoa escaneando 2x)
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

    return { success: true };
  } catch (err) {
    console.error("[createLead] Erro:", err);
    return { error: "Algo deu errado. Tente de novo." };
  }
}
