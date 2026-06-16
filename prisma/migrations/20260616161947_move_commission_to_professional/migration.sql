-- 1. Adiciona os campos em professionals (nullable/com default, seguro)
ALTER TABLE "professionals" ADD COLUMN "commissionOnServices" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "professionals" ADD COLUMN "commissionOnProducts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "professionals" ADD COLUMN "commissionServicePct" DECIMAL(5,2);
ALTER TABLE "professionals" ADD COLUMN "commissionProductPct" DECIMAL(5,2);

-- 2. BACKFILL: copia os dados existentes de memberships para professionals,
--    via o relacionamento professionalId
UPDATE "professionals" p
SET
  "commissionOnServices" = m."commissionOnServices",
  "commissionOnProducts" = m."commissionOnProducts",
  "commissionServicePct" = m."commissionServicePct",
  "commissionProductPct" = m."commissionProductPct"
FROM "memberships" m
WHERE m."professionalId" = p.id;

-- 3. Só depois do backfill confirmado, remove os campos antigos de memberships
ALTER TABLE "memberships" DROP COLUMN "commissionOnServices";
ALTER TABLE "memberships" DROP COLUMN "commissionOnProducts";
ALTER TABLE "memberships" DROP COLUMN "commissionServicePct";
ALTER TABLE "memberships" DROP COLUMN "commissionProductPct";
