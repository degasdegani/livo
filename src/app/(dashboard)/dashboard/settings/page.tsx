// src/app/(dashboard)/dashboard/settings/page.tsx
import { redirect } from "next/navigation";
import { MemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { CopyUrlButton } from "./copy-url-button";
import { SettingsAccordion } from "./settings-accordion";
import { TvGoalsSection } from "./tv-goals-section";

export default async function SettingsPage() {
  const membership = await requireRole(MemberRole.owner);
  const barbershopId = membership.barbershopId;

  const [user, barbershop] = await Promise.all([
    db.user.findUnique({
      where: { id: membership.userId },
      select: {
        name: true,
        email: true,
        cpf: true,
        birthDate: true,
      },
    }),
    db.barbershop.findUnique({
      where: { id: membership.barbershopId },
      select: {
        name: true,
        slug: true,
        phone: true,
        city: true,
        coverPhotoUrl: true,
        logoUrl: true,
        reopenPin: true,
        services: { orderBy: { name: "asc" } },
        businessHours: { orderBy: { dayOfWeek: "asc" } },
      },
    }),
  ]);

  if (!barbershop || !user) redirect("/onboarding");

  // ── Ranking TV — metas, PIN e dispositivos ──
  const [barbershopGoals, profGoalsRaw, tvDevices, barbershopForPin, professionalsRaw] =
    await Promise.all([
      db.barbershopGoal.findMany({ where: { barbershopId } }),
      db.professionalGoal.findMany({ where: { barbershopId } }),
      db.tvDevice.findMany({
        where: { barbershopId },
        orderBy: { createdAt: "desc" },
      }),
      db.barbershop.findUnique({
        where: { id: barbershopId },
        select: { tvPin: true },
      }),
      db.professional.findMany({
        where: { barbershopId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const professionals = professionalsRaw.map((p) => ({
    ...p,
    goals: profGoalsRaw.filter((g) => g.professionalId === p.id),
  }));

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

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Endereço público */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                ENDEREÇO PÚBLICO
              </p>
              <p
                className="text-sm font-bold truncate"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "monospace",
                }}
              >
                livobarber.com.br/{barbershop.slug}
              </p>
            </div>
            <CopyUrlButton
              url={`https://livobarber.com.br/${barbershop.slug}`}
            />
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
          style={{ backgroundColor: "var(--bg-card)" }}
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

        {/* Accordion de configurações */}
        <SettingsAccordion
          user={{
            name: user.name ?? "",
            email: user.email ?? "",
            cpf: user.cpf ?? null,
            birthDate: user.birthDate ?? null,
            phone: barbershop.phone ?? null,
          }}
          barbershop={{
            name: barbershop.name,
            phone: barbershop.phone,
            city: barbershop.city,
            coverPhotoUrl: barbershop.coverPhotoUrl,
            logoUrl: barbershop.logoUrl,
            services: barbershop.services,
            businessHours: barbershop.businessHours,
          }}
          hasReopenPin={!!barbershop.reopenPin}
        />

        {/* Ranking TV — metas, PIN e dispositivos */}
        <section
          className="p-5 rounded-xl flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            className="text-sm font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Ranking TV
          </h2>
          <TvGoalsSection
            barbershopGoals={barbershopGoals}
            professionals={professionals}
            tvPin={barbershopForPin?.tvPin ?? null}
            devices={tvDevices}
          />
        </section>
      </main>
    </div>
  );
}
