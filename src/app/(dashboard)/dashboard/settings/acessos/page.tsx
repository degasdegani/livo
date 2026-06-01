import AcessosClient from "./acessos-client";
import { getAcessosData } from "./actions";

export const metadata = { title: "Acessos — LIVO" };

export default async function AcessosPage() {
  const data = await getAcessosData();
  return <AcessosClient initialData={data} />;
}
