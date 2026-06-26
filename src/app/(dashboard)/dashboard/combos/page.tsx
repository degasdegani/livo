import { requireRole } from "@/lib/permissions";
import { getCombosData } from "./actions";
import { CombosClient } from "./combos-client";

export const metadata = { title: "Combos — LIVO" };

export default async function CombosPage() {
  await requireRole(["owner"]);
  const data = await getCombosData();
  return <CombosClient data={data} />;
}
