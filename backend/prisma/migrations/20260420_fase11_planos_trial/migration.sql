-- Fase 11.1 — renomeia PlanId FREE→TRIAL, ENTERPRISE→BUSINESS e
-- SubscriptionStatus TRIALING→TRIAL (+ novo BLOCKED).
-- Adiciona campos de trial/bloqueio em Subscription, Workspace, Membership.

-- PlanId: FREE -> TRIAL, ENTERPRISE -> BUSINESS
ALTER TYPE "PlanId" RENAME VALUE 'FREE' TO 'TRIAL';
ALTER TYPE "PlanId" RENAME VALUE 'ENTERPRISE' TO 'BUSINESS';

-- SubscriptionStatus: TRIALING -> TRIAL, adiciona BLOCKED
ALTER TYPE "SubscriptionStatus" RENAME VALUE 'TRIALING' TO 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'BLOCKED';

-- Subscription: novos campos
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "blockReason" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "extraAgents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "extraWorkspaces" INTEGER NOT NULL DEFAULT 0;

-- Default agora é TRIAL (para novos registros criados sem passar plan/status)
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'TRIAL';
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL';

-- Workspace.blockedAt (bloqueio individual pelo SUPER_ADMIN)
ALTER TABLE "Workspace" ADD COLUMN "blockedAt" TIMESTAMP(3);

-- Membership.blockedAt (bloqueio de agente específico)
ALTER TABLE "Membership" ADD COLUMN "blockedAt" TIMESTAMP(3);
