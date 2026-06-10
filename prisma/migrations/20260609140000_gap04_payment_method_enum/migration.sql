-- GAP-04: Add missing PaymentMethod enum values
-- cortesia, convenio, outros were added to schema.prisma but never migrated.
-- IF NOT EXISTS ensures idempotency in case values already exist.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'cortesia';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'convenio';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'outros';
