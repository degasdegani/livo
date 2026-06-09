import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const indexes = await prisma.$queryRaw`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      array_to_string(array_agg(a.attname ORDER BY x.n), ', ') AS columns
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, n) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
    WHERE t.relkind = 'r'
      AND t.relname IN (
        'professionals','services','clients','appointments',
        'business_hours','memberships','invitations',
        'product_categories','products','stock_movements','comandas'
      )
    GROUP BY t.relname, i.relname
    ORDER BY t.relname, i.relname
  `;
  console.log(JSON.stringify(indexes, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });