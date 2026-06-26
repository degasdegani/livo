import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClientSession, getClientArea, getClubPageData } from "./actions";
import { AreaCliente } from "./area-cliente";
import { FluxoAssinatura } from "./fluxo-assinatura";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClubePage({ params }: Props) {
  const { slug } = await params;

  // Resolver slug → barbershop
  const barbershop = await db.barbershop.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      clubEnabled: true,
      clubAsaasAccountStatus: true,
    },
  });

  if (!barbershop || !barbershop.clubEnabled) {
    notFound();
  }

  // Verificar sessão existente
  const session = await getClientSession(barbershop.id);

  // Se já logado, mostrar a área do assinante
  if (session) {
    const { subscription } = await getClientArea(barbershop.id);
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg-base)" }}>
        <AreaCliente
          barbershopName={barbershop.name}
          clientPhone={session.phone}
          subscription={subscription as any}
        />
      </div>
    );
  }

  const { plans } = await getClubPageData(barbershop.id);
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-base)" }}>
      <FluxoAssinatura
        plans={plans as any}
        barbershopId={barbershop.id}
        barbershopName={barbershop.name}
      />
    </div>
  );
}
