import { requireMembership } from "@/lib/permissions";
import { getProfessionalsForComanda } from "../actions";
import NovaComandaForm from "./nova-comanda-form";

export default async function NovaComandaPage() {
  const membership = await requireMembership();
  const professionals = await getProfessionalsForComanda();

  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      <div className="border-b border-[#2A2A33] bg-[#0B0B0D] px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Nova Comanda</h1>
        <p className="mt-0.5 text-sm text-[#9A9AA6]">
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
