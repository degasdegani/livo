// src/app/(dashboard)/template.tsx
// Gate de billing isolado em template.tsx (não layout.tsx) DE PROPÓSITO: no Next.js
// App Router, layouts compartilhados entre rotas irmãs NÃO são remontados ao
// navegar entre elas (só o page.tsx muda) — então uma checagem de segurança em
// layout.tsx só roda no primeiro carregamento da sessão de navegação, nunca mais
// depois disso ao clicar entre Agenda/Clientes/Comandas etc. template.tsx, ao
// contrário, remonta do zero A CADA navegação — é o mecanismo correto do Next.js
// para isso. Bug real de produção: trial vencido não bloqueava navegação por
// clique, só hard refresh. Corrigido movendo o gate para cá.
import { headers } from "next/headers";
import { requireMembership, checkBillingAccess } from "@/lib/permissions";
import { BillingGraceBanner } from "@/components/billing-grace-banner";

// Rotas que não devem ser bloqueadas pelo billing check: as próprias telas
// de resolução de billing, mais Plano LIVO e Configurações — o usuário
// bloqueado ainda precisa conseguir ver/pagar a fatura e ajustar a conta.
const BILLING_EXEMPT = [
  "/dashboard/assinar",
  "/dashboard/suspenso",
  "/dashboard/faturamento",
  "/dashboard/settings",
];

export default async function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await requireMembership();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isBillingExempt = BILLING_EXEMPT.some((p) => pathname.startsWith(p));

  let graceEndsAt: Date | null = null;
  if (!isBillingExempt) {
    const result = await checkBillingAccess(membership.barbershopId);
    if (result.status === "grace") {
      graceEndsAt = result.graceEndsAt;
    }
  }

  return (
    <>
      {graceEndsAt && <BillingGraceBanner graceEndsAt={graceEndsAt} />}
      {children}
    </>
  );
}
