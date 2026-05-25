// Server Component — busca dados no banco e passa para o formulário
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { BookingForm } from "./booking-form";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { slug } = await params;
  const { serviceId } = await searchParams;

  // Sem serviceId → volta para a página da barbearia
  if (!serviceId) redirect(`/${slug}`);

  // Busca barbearia + profissional + serviço no banco
  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      professionals: { where: { isActive: true }, take: 1 },
      services: { where: { id: serviceId, isActive: true } },
    },
  });

  if (!barbershop) notFound();

  const professional = barbershop.professionals[0];
  const service = barbershop.services[0];

  // Sem profissional ou serviço → 404
  if (!professional || !service) notFound();

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
          professionalId={professional.id}
          serviceName={service.name}
          serviceId={service.id}
          serviceDuration={service.durationMin}
          servicePrice={service.priceInCents}
          barbershopName={barbershop.name}
          barbershopSlug={slug}
        />
      </div>
    </main>
  );
}
