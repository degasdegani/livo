// ============================================================
// LIVO — Página de Configurações
// Gerencia informações básicas, serviços e horários
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BasicInfoForm } from "./basic-info-form";
import { BusinessHoursForm } from "./business-hours-form";
import { ServicesManager } from "./services-manager";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { orderBy: { name: "asc" } },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!barbershop) redirect("/onboarding");

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
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity mr-2"
            style={{ color: "#52525B" }}
          >
            ← Dashboard
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
            Configurações
          </span>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Slug da barbearia (somente leitura) */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "#52525B" }}
            >
              ENDEREÇO PÚBLICO
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: "#A1A1AA", fontFamily: "monospace" }}
            >
              livobarber.com.br/{barbershop.slug}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", color: "#3F3F46" }}
          >
            fixo
          </span>
        </div>

        {/* Seção 1: Informações básicas */}
        <BasicInfoForm
          name={barbershop.name}
          phone={barbershop.phone || ""}
          city={barbershop.city || ""}
        />

        {/* Seção 2: Serviços */}
        <ServicesManager services={barbershop.services} />

        {/* Seção 3: Horários */}
        <BusinessHoursForm businessHours={barbershop.businessHours} />
      </main>
    </div>
  );
}
