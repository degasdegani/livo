import { getAssinantes } from "../actions";
import { AssinantesClient } from "./assinantes-client";

export default async function AssinantesPage() {
  const data = await getAssinantes();
  return <AssinantesClient data={data} />;
}
