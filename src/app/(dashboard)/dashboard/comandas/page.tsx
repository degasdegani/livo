import { requireMembership } from "@/lib/permissions";
import { listComandas } from "./actions";
import ComandasClient from "./comandas-client";

export default async function ComandasPage() {
  const membership = await requireMembership();
  const comandas = await listComandas("open");

  return (
    <ComandasClient
      initialComandas={comandas}
      role={membership.role}
      professionalId={membership.professionalId}
    />
  );
}
