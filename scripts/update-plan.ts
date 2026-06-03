// scripts/update-plan.ts
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  // Atualiza TODAS as barbearias que ainda estão no plano "start" para "pro"
  const result = await db.barbershop.updateMany({
    where: { plan: "start" },
    data: { plan: "pro" },
  });

  console.log(`✅ ${result.count} barbearia(s) atualizada(s) para o plano PRO`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
