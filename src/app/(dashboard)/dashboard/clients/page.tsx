// ============================================================
// LIVO — Página de Clientes
// CRM automático: lista todos os clientes da barbearia
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ClientList } from "./client-list";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const barbershop = await db.barbershop.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!barbershop) redirect("/onboarding");

  // Busca todos os clientes ordenados por última visita
  const clients = await db.client.findMany({
    where: { barbershopId: barbershop.id },
    orderBy: { lastVisitAt: "desc" },
  });

  // Métricas rápidas
  const totalClients = clients.length;
  const activeThisMonth = clients.filter((c) => {
    if (!c.lastVisitAt) return false;
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return new Date(c.lastVisitAt) >= monthAgo;
  }).length;
  const avgVisits =
    totalClients > 0
      ? (
          clients.reduce((sum, c) => sum + c.totalVisits, 0) / totalClients
        ).toFixed(1)
      : "0";

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
            className="text-xs hover:opacity-70 transition-opacity mr-2"
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
            Clientes
          </span>
        </div>
        <span className="text-sm" style={{ color: "#52525B" }}>
          {totalClients} cadastrados
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "TOTAL",
              value: totalClients.toString(),
              color: "#00D4FF",
            },
            {
              label: "ÚLTIMOS 30D",
              value: activeThisMonth.toString(),
              color: "#00D4A0",
            },
            { label: "MÉDIA VISITAS", value: avgVisits, color: "#7C3AED" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-4"
              style={{
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-xs font-bold tracking-widest mb-2"
                style={{ color: "#3F3F46", fontFamily: "var(--font-mono)" }}
              >
                {kpi.label}
              </p>
              <p
                className="font-black"
                style={{
                  fontSize: "28px",
                  letterSpacing: "-1px",
                  color: kpi.color,
                  lineHeight: 1,
                }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Lista com busca */}
        <ClientList clients={clients} />
      </main>
    </div>
  );
}
