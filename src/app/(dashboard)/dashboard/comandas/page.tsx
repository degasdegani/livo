import { requireMembershipWithBilling } from "@/lib/permissions";
import { getComandas } from "./actions";
import ComandasClient from "./comandas-client";

export default async function ComandasPage() {
  const membership = await requireMembershipWithBilling();
  const comandas = await getComandas("abertas");

  return (
    <ComandasClient
      initialComandas={comandas}
      role={membership.role}
      professionalId={membership.professionalId}
    />
  );
}
