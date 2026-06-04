// src/app/(dashboard)/dashboard/settings/page.tsx
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
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          backgroundColor: "var(--bg-base)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          opacity: 0.97,
        }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity mr-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            ← Dashboard
          </a>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "inline-block",
            }}
          />
          <span
            className="font-black"
            style={{
              fontSize: "16px",
              letterSpacing: "-0.3px",
              color: "var(--text-primary)",
            }}
          >
            Configurações
          </span>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Slug da barbearia */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              ENDEREÇO PÚBLICO
            </p>
            <p
              className="text-sm font-bold"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "monospace",
              }}
            >
              livobarber.com.br/{barbershop.slug}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: "var(--bg-card-elevated)",
              color: "var(--text-tertiary)",
            }}
          >
            fixo
          </span>
        </div>

        {/* Card de Acessos */}
        <a
          href="/dashboard/settings/acessos"
          className="flex items-center justify-between rounded-xl px-5 py-4 transition-all settings-acessos-link"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              EQUIPE
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Acessos e membros
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Convide recepcionistas e barbeiros para acessar o sistema
            </p>
          </div>
          <span style={{ color: "var(--text-tertiary)" }}>→</span>
        </a>

        <BasicInfoForm
          name={barbershop.name}
          phone={barbershop.phone || ""}
          city={barbershop.city || ""}
        />
        <ServicesManager services={barbershop.services} />
        <BusinessHoursForm businessHours={barbershop.businessHours} />
      </main>
    </div>
  );
}
