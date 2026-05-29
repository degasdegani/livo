import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const barbershops = await prisma.barbershop.findMany({
    select: { id: true, ownerId: true, name: true },
  });

  console.log(`Encontradas ${barbershops.length} barbearias.\n`);

  for (const shop of barbershops) {
    const existing = await prisma.membership.findUnique({
      where: {
        userId_barbershopId: { userId: shop.ownerId, barbershopId: shop.id },
      },
    });

    if (existing) {
      console.log(`• Já existe crachá: ${shop.name}`);
      continue;
    }

    await prisma.membership.create({
      data: {
        userId: shop.ownerId,
        barbershopId: shop.id,
        role: "owner",
      },
    });

    console.log(`✓ Crachá de dono criado: ${shop.name}`);
  }

  console.log("\nConcluído!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Erro:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
