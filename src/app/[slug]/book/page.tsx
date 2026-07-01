// Server Component — busca dados no banco e passa para o formulário
import { db } from "@/lib/db";
import { isEmailGateBlocked } from "@/lib/email-gate";
import { notFound, redirect } from "next/navigation";
import { BookingForm } from "./booking-form";
import { PublicUnavailable } from "../unavailable";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serviceIds?: string }>;
}) {
  const { slug } = await params;
  const { serviceIds: serviceIdsParam } = await searchParams;

  // Sem serviceIds → volta para a página da barbearia
  if (!serviceIdsParam) redirect(`/${slug}`);

  const serviceIdsList = serviceIdsParam.split(",").filter(Boolean);
  if (serviceIdsList.length === 0) redirect(`/${slug}`);

  // Busca barbearia + TODOS os profissionais ativos + serviços solicitados
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      professionals: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
      services: {
        where: { id: { in: serviceIdsList }, isActive: true },
      },
      owner: { select: { emailVerified: true } },
    },
  });

  if (!barbershop) notFound();

  // Portão suave: mesma checagem da página pública pai (query própria aqui).
  if (
    isEmailGateBlocked({
      planStatus: barbershop.planStatus,
      emailVerified: barbershop.owner.emailVerified,
    })
  ) {
    return <PublicUnavailable />;
  }

  const professionals = barbershop.professionals;
  const services = barbershop.services;

  // Sem profissional ou nenhum serviço encontrado → 404
  if (professionals.length === 0 || services.length === 0) notFound();

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Logo */}
        <div className="flex items-center gap-1.5 mb-8">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
            }}
          />
          <span className="text-xs font-bold" style={{ color: "#52525B" }}>
            livo
          </span>
        </div>

        {/* Formulário client-side com todos os dados já carregados */}
        <BookingForm
          barbershopId={barbershop.id}
          serviceIds={serviceIdsList}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMin: s.durationMin,
            priceInCents: s.priceInCents,
          }))}
          professionals={professionals.map((p) => ({
            id: p.id,
            name: p.name,
            avatarUrl: p.avatarUrl,
          }))}
          barbershopName={barbershop.name}
          barbershopSlug={slug}
        />
      </div>
    </main>
  );
}
