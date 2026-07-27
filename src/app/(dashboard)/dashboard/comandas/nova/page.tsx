// src/app/(dashboard)/dashboard/comandas/nova/page.tsx
import { requireMembershipWithBilling } from "@/lib/permissions";
import { getProfessionalsForComanda } from "../actions";
import NovaComandaForm from "./nova-comanda-form";

export default async function NovaComandaPage() {
  const membership = await requireMembershipWithBilling();
  const professionals = await getProfessionalsForComanda();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <div
        className="px-6 py-4"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-base)",
        }}
      >
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Nova Comanda
        </h1>
        <p
          className="mt-0.5 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Abra um atendimento ou venda avulsa
        </p>
      </div>
      <div className="mx-auto max-w-lg p-6">
        <NovaComandaForm
          professionals={professionals}
          myProfessionalId={membership.professionalId}
          role={membership.role}
        />
      </div>
    </div>
  );
}
