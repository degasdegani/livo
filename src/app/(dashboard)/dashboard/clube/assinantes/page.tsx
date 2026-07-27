import { requireMembershipWithBilling } from "@/lib/permissions";
import { getAssinantes } from "../actions";
import { AssinantesClient } from "./assinantes-client";

export default async function AssinantesPage() {
  await requireMembershipWithBilling();

  const data = await getAssinantes();
  return <AssinantesClient data={data} />;
}
