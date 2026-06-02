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
  const parts = [street, neighborhood, city, state, cep, "Brasil"].filter(
    Boolean,
  );
  if (parts.length < 3) return null;

  const query = encodeURIComponent(`${name}, ${parts.join(", ")}`);

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`rounded-xl overflow-hidden border border-[#2A2A33]`}
        style={{ height }}
      >
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${query}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          title={`Localização de ${name}`}
        />
      </div>
    </div>
  );
}
