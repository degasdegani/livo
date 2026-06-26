import { db } from "@/lib/db";

/**
 * Retorna true se o Clube de Assinatura está habilitado para a barbearia.
 * Leitura simples — sem cache, sem side effects.
 */
export async function isClubEnabled(barbershopId: string): Promise<boolean> {
  const barbershop = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { clubEnabled: true },
  });
  return barbershop?.clubEnabled === true;
}

/**
 * Usar em Server Components e Server Actions do Clube.
 * Se o clube estiver desligado para a barbearia, lança um erro com código
 * identificável — o chamador decide se redireciona ou retorna 404.
 *
 * Uso em Server Action:
 *   const enabled = await isClubEnabled(barbershopId);
 *   if (!enabled) return { error: "Clube nao disponivel." };
 *
 * Uso em Server Component (page.tsx):
 *   const enabled = await isClubEnabled(barbershopId);
 *   if (!enabled) notFound();
 */
export class ClubDisabledError extends Error {
  constructor() {
    super("CLUBE_DISABLED");
    this.name = "ClubDisabledError";
  }
}

export async function requireClubEnabled(barbershopId: string): Promise<void> {
  const enabled = await isClubEnabled(barbershopId);
  if (!enabled) throw new ClubDisabledError();
}
