-- P0.5: barbershopId indexes for all multi-tenant tables
-- Improves all barbershop-scoped queries (dominant query pattern in the system)
-- IF NOT EXISTS makes this idempotent and safe to re-run

CREATE INDEX IF NOT EXISTS "professionals_barbershopId_idx"      ON "professionals"("barbershopId");
CREATE INDEX IF NOT EXISTS "services_barbershopId_idx"           ON "services"("barbershopId");
CREATE INDEX IF NOT EXISTS "clients_barbershopId_idx"            ON "clients"("barbershopId");
CREATE INDEX IF NOT EXISTS "appointments_barbershopId_idx"       ON "appointments"("barbershopId");
CREATE INDEX IF NOT EXISTS "business_hours_barbershopId_idx"     ON "business_hours"("barbershopId");
CREATE INDEX IF NOT EXISTS "memberships_barbershopId_idx"        ON "memberships"("barbershopId");
CREATE INDEX IF NOT EXISTS "invitations_barbershopId_idx"        ON "invitations"("barbershopId");
CREATE INDEX IF NOT EXISTS "product_categories_barbershopId_idx" ON "product_categories"("barbershopId");
CREATE INDEX IF NOT EXISTS "products_barbershopId_idx"           ON "products"("barbershopId");
CREATE INDEX IF NOT EXISTS "stock_movements_barbershopId_idx"    ON "stock_movements"("barbershopId");
CREATE INDEX IF NOT EXISTS "comandas_barbershopId_idx"           ON "comandas"("barbershopId");
