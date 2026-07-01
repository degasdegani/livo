import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isEmailGateBlocked } from "@/lib/email-gate";
import { getClientSession, getClientArea, getClubPageData } from "./actions";
import { AreaCliente } from "./area-cliente";
import { FluxoAssinatura } from "./fluxo-assinatura";
import { PublicUnavailable } from "../unavailable";

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
      planStatus: true,
      owner: { select: { emailVerified: true } },
    },
  });

  if (!barbershop || !barbershop.clubEnabled) {
    notFound();
  }

  // Portão suave: mesma checagem das demais páginas públicas (query própria).
  if (
    isEmailGateBlocked({
      planStatus: barbershop.planStatus,
      emailVerified: barbershop.owner.emailVerified,
    })
  ) {
    return <PublicUnavailable />;
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
