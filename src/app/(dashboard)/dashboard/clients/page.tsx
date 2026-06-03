// src/app/(dashboard)/dashboard/clients/page.tsx
import { requireMembership } from "@/lib/permissions";
import { getClientsData, getClientStats } from "./actions";
import { ClientsClient } from "./clients-client";

export default async function ClientsPage() {
  const membership = await requireMembership();
  const [clients, stats] = await Promise.all([
    getClientsData(),
    getClientStats(membership.barbershopId),
  ]);

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Clientes
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Gerencie sua base de clientes, filtre sumidos e veja aniversariantes.
        </p>
      </div>

      <ClientsClient
        initialClients={
          clients as Parameters<typeof ClientsClient>[0]["initialClients"]
        }
        stats={stats}
      />
    </div>
  );
}
