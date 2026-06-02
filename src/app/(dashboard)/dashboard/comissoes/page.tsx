import { db } from "@/lib/db";
import { requireMembership } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { getComissoesData } from "../comandas/actions";
import { ComissoesClient } from "./comissoes-client";

export default async function ComissoesPage() {
  const membership = await requireMembership();

  const { resumo, profissionais, dataInicio, dataFim } =
    await getComissoesData("mes_atual");

  // Buscar memberships com percentuais configurados (só owner vê isso)
  const membershipsComPct =
    membership.role === MemberRole.owner
      ? await db.membership.findMany({
          where: { barbershopId: membership.barbershopId, isActive: true },
          include: { professional: { select: { id: true, name: true } } },
        })
      : [];

  return (
    <ComissoesClient
      resumoInicial={resumo}
      profissionais={profissionais}
      memberships={membershipsComPct}
      dataInicio={dataInicio}
      dataFim={dataFim}
      role={membership.role}
      myProfessionalId={membership.professionalId}
    />
  );
}
