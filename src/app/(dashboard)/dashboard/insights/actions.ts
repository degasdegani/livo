"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModuleAccess } from "@/lib/modules";
import { requireRole } from "@/lib/permissions";

export async function dismissInsight(formData: FormData) {
  const recId = formData.get("recId");
  if (typeof recId !== "string" || !recId) return;

  const membership = await requireRole(["owner", "reception"]);
  const { barbershopId } = membership;
  await requireModuleAccess(barbershopId, "insights");

  await db.insightDismissal.upsert({
    where: { barbershopId_recId: { barbershopId, recId } },
    create: { barbershopId, recId },
    update: { dismissedAt: new Date() },
  });

  revalidatePath("/dashboard/insights");
}
