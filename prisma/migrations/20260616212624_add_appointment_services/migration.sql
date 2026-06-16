-- 1. Cria a tabela de junção appointment_services
--    serviceId é nullable + snapshots desnormalizados (mesmo padrão de comanda_items):
--    se o Service for editado/excluído depois, o histórico do agendamento permanece intacto.
CREATE TABLE "appointment_services" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "servicePriceInCents" INTEGER NOT NULL,
    "serviceDurationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- Índice para a consulta mais frequente: "todos os serviços deste agendamento"
CREATE INDEX "appointment_services_appointmentId_idx" ON "appointment_services"("appointmentId");

-- FK para appointments com CASCADE: deleção do Appointment remove seus itens junto
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK para services com SET NULL: deleção do Service anula o ponteiro mas preserva os snapshots
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. BACKFILL: copia dados existentes de Appointment.serviceId para a nova tabela,
--    capturando snapshot de nome/preço/duração do Service no momento da migration.
--    INNER JOIN é seguro: appointments.serviceId é NOT NULL com FK para services.id
--    sem onDelete Cascade, garantindo que não existem serviceIds órfãos na tabela.
INSERT INTO appointment_services (
    id,
    "appointmentId",
    "serviceId",
    "serviceName",
    "servicePriceInCents",
    "serviceDurationMin",
    "createdAt"
)
SELECT
    gen_random_uuid()::text,
    a.id,
    a."serviceId",
    s.name,
    s."priceInCents",
    s."durationMin",
    NOW()
FROM appointments a
INNER JOIN services s ON s.id = a."serviceId";
