"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "completed" | "cancelled" | "no_show",
) {
  await db.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
}
