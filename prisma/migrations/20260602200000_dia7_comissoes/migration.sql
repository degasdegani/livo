-- Removidas foreign keys antigas
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_barbershopId_fkey";
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_invitedById_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_barbershopId_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_professionalId_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- Renomear tabelas preservando dados
ALTER TABLE "Membership" RENAME TO "memberships";
ALTER TABLE "Invitation" RENAME TO "invitations";

-- Novos campos de comissão
ALTER TABLE "memberships" ADD COLUMN "commissionServicePct" DECIMAL(5,2);
ALTER TABLE "memberships" ADD COLUMN "commissionProductPct" DECIMAL(5,2);

-- Índices únicos
CREATE UNIQUE INDEX "memberships_professionalId_key" ON "memberships"("professionalId");
CREATE UNIQUE INDEX "memberships_userId_barbershopId_key" ON "memberships"("userId", "barbershopId");
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- Foreign keys novas
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ajustes de primary key e defaults
ALTER TABLE "invitations" RENAME CONSTRAINT "Invitation_pkey" TO "invitations_pkey";
ALTER TABLE "invitations" ALTER COLUMN "commissionOnServices" SET DEFAULT false;
ALTER TABLE "memberships" RENAME CONSTRAINT "Membership_pkey" TO "memberships_pkey";
ALTER TABLE "memberships" ALTER COLUMN "commissionOnServices" SET DEFAULT false;
