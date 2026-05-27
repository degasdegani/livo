// ============================================================
// LIVO — Página: Novo Agendamento Manual
// Barbeiro registra walk-ins e pedidos por telefone
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewAppointmentForm } from "./new-appointment-form";

export default async function NewAppointmentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
      professionals: { where: { isActive: true }, take: 1 },
    },
  });
  if (!barbershop) redirect("/onboarding");

  const professional = barbershop.professionals[0];
  if (!professional) redirect("/dashboard/settings");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/agenda"
            className="text-xs hover:opacity-70 transition-opacity mr-2"
            style={{ color: "#52525B" }}
          >
            ← Agenda
          </a>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
            }}
          />
          <span
            className="font-black text-white"
            style={{ fontSize: "16px", letterSpacing: "-0.3px" }}
          >
            Novo agendamento
          </span>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{
            background: "rgba(255,45,85,0.08)",
            color: "#FF2D55",
            border: "1px solid rgba(255,45,85,0.2)",
          }}
        >
          Manual
        </span>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1
            className="font-black text-white mb-1"
            style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
          >
            Registrar atendimento
          </h1>
          <p className="text-sm" style={{ color: "#52525B" }}>
            Walk-in, telefone ou qualquer atendimento presencial.
          </p>
        </div>

        <NewAppointmentForm
          services={barbershop.services}
          professional={professional}
          barbershopId={barbershop.id}
        />
      </main>
    </div>
  );
}
