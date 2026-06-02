import { requireMembership } from "@/lib/permissions";
import { getCategories, getProducts } from "./actions";
import { ProdutosClient } from "./produtos-client";

export default async function ProdutosPage() {
  const membership = await requireMembership();

  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <ProdutosClient
      products={products}
      categories={categories}
      role={membership.role}
    />
  );
}
