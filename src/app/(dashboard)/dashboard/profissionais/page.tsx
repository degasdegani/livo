import { Scissors } from "lucide-react";
import { redirect } from "next/navigation";
import { hasModuleAccess } from "@/lib/modules";
import { requireRole } from "@/lib/permissions";
import { getProfessionalsData } from "./actions";
import { ProfissionaisClient } from "./profissionais-client";

export const metadata = { title: "Profissionais — LIVO" };

export default async function ProfissionaisPage() {
  // Gate no TOPO da page (antes só existia dentro de getProfessionalsData) —
  // corrige a divergência de padrão. requireRole("owner") = mesma restrição da action.
  const membership = await requireRole("owner");
  if (!(await hasModuleAccess(membership.barbershopId, "profissionais"))) {
    redirect("/dashboard/assinar");
  }

  const professionals = await getProfessionalsData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "var(--bg-card-elevated)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Scissors size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Profissionais
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Gerencie os barbeiros da sua barbearia
          </p>
        </div>
      </div>

      <ProfissionaisClient initialData={professionals} />
    </div>
  );
}
