import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { getComissoesData } from "../comandas/actions";
import { ComissoesClient } from "./comissoes-client";

export default async function ComissoesPage() {
  const membership = await requireMembership();

  const { resumo, profissionais, dataInicio, dataFim } =
    await getComissoesData("mes_atual");

  // Comissão vive em Professional agora — busca todos os profissionais ativos
  // da barbearia (não só os que têm Membership/login vinculado).
  const professionalsComPct =
    membership.role === MemberRole.owner
      ? (
          await db.professional.findMany({
            where: { barbershopId: membership.barbershopId, isActive: true },
            include: { membership: { select: { role: true } } },
          })
        ).map((p) => ({
          id: p.id,
          name: p.name,
          membershipRole: p.membership?.role ?? null,
          commissionOnServices: p.commissionOnServices,
          commissionOnProducts: p.commissionOnProducts,
          commissionServicePct: p.commissionServicePct,
          commissionProductPct: p.commissionProductPct,
        }))
      : [];

  return (
    <ComissoesClient
      resumoInicial={resumo}
      profissionais={profissionais}
      professionalsComPct={professionalsComPct}
      dataInicio={dataInicio}
      dataFim={dataFim}
      role={membership.role}
      myProfessionalId={membership.professionalId}
    />
  );
}
