// src/components/barbershop-map.tsx

interface BarbershopMapProps {
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  name: string;
  className?: string;
  height?: string;
}

export function BarbershopMap({
  street,
  neighborhood,
  city,
  state,
  cep,
  name,
  className = "",
  height = "300px",
}: BarbershopMapProps) {
  // Monta o endereço completo para busca
  const parts = [street, neighborhood, city, state, cep, "Brasil"].filter(
    Boolean,
  );
  if (parts.length < 3) return null; // sem endereço suficiente, não renderiza

  const query = encodeURIComponent(`${name}, ${parts.join(", ")}`);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // URL com ou sem API key
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&language=pt-BR`
    : `https://maps.google.com/maps?q=${query}&output=embed&hl=pt-BR`;

  return (
    <div
      className={`rounded-xl overflow-hidden border border-[#2A2A33] ${className}`}
      style={{ height }}
    >
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Localização de ${name}`}
      />
    </div>
  );
}
