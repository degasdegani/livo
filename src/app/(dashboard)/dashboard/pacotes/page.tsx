import { requireRole } from "@/lib/permissions";
import { getPackagesData } from "./actions";
import { PacotesClient } from "./pacotes-client";

export const metadata = { title: "Pacotes — LIVO" };

export default async function PacotesPage() {
  await requireRole(["owner"]);
  const data = await getPackagesData();
  return <PacotesClient data={data} />;
}
