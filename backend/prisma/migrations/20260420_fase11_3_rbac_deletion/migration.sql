-- Fase 11.3: RBAC OWNER/AGENT + DeletionRequest

-- 1) Novo valor no enum Role. Postgres exige ADD VALUE fora de transação —
--    prisma migrate deploy lida com isso.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';

-- 2) Enums novos.
DO $$ BEGIN
  CREATE TYPE "DeletionRequestType" AS ENUM ('WORKSPACE', 'ACCOUNT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'CANCELED', 'EXECUTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tabela DeletionRequest.
CREATE TABLE IF NOT EXISTS "DeletionRequest" (
  "id"           TEXT PRIMARY KEY,
  "workspaceId"  TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "type"         "DeletionRequestType" NOT NULL,
  "status"       "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason"       TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "canceledAt"   TIMESTAMP(3),
  "executedAt"   TIMESTAMP(3),
  CONSTRAINT "DeletionRequest_workspace_fk"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE,
  CONSTRAINT "DeletionRequest_user_fk"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DeletionRequest_workspaceId_status_idx"
  ON "DeletionRequest"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "DeletionRequest_scheduledFor_status_idx"
  ON "DeletionRequest"("scheduledFor", "status");

-- 4) Backfill: o primeiro membro de cada workspace (ADMIN mais antigo)
--    vira OWNER. Workspaces existentes ganham OWNER para poder operar.
UPDATE "Membership" m SET "role" = 'OWNER'
WHERE m."id" IN (
  SELECT DISTINCT ON ("workspaceId") "id"
  FROM "Membership"
  WHERE "role" = 'ADMIN'
  ORDER BY "workspaceId", "createdAt" ASC
);
