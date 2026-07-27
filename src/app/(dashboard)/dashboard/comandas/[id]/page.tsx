import { requireMembershipWithBilling } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getComanda, getProductsForPDV, getServicesForPDV } from "../actions";
import ComandaPDV from "./comanda-pdv";

type Props = { params: Promise<{ id: string }> };

export default async function ComandaPage({ params }: Props) {
  const { id } = await params;
  const membership = await requireMembershipWithBilling();

  const [comanda, services, products] = await Promise.all([
    getComanda(id),
    getServicesForPDV(),
    getProductsForPDV(),
  ]);

  if (!comanda) redirect("/dashboard/comandas");

  return (
    <ComandaPDV
      comanda={comanda}
      services={services}
      products={products}
      role={membership.role}
      myProfessionalId={membership.professionalId}
    />
  );
}
