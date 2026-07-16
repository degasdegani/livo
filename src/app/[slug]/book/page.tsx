// Server Component — busca dados no banco e passa para o formulário
import { db } from "@/lib/db";
import { isEmailGateBlocked } from "@/lib/email-gate";
import { notFound } from "next/navigation";
import { BookingForm } from "./booking-form";
import { PublicUnavailable } from "../unavailable";

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const barbershop = await db.barbershop.findUnique({
    where: { slug, isActive: true },
    include: {
      professionals: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
      services: {
        where: { isActive: true },
        orderBy: { priceInCents: "asc" },
      },
      owner: { select: { emailVerified: true } },
    },
  });
  if (!barbershop) notFound();

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

  // Sem profissional ou nenhum serviço ativo → 404
  if (professionals.length === 0 || services.length === 0) notFound();

  return (
    <main
      className="min-h-screen"
      data-theme="dark"
      style={{ backgroundColor: "var(--pb-bg)" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        <BookingForm
          barbershopId={barbershop.id}
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
            specialties: p.specialties,
            yearStarted: p.yearStarted,
            avgRating: p.avgRating ? Number(p.avgRating) : null,
            reviewCount: p.reviewCount,
          }))}
          barbershopName={barbershop.name}
          barbershopSlug={slug}
          barbershopPhone={barbershop.phone}
          barbershopAddress={[
            barbershop.street,
            barbershop.neighborhood,
            barbershop.city,
            barbershop.state,
          ]
            .filter(Boolean)
            .join(", ")}
        />
      </div>
    </main>
  );
}
