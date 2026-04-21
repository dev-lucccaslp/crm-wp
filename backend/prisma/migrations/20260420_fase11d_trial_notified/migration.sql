-- Anti-repeat de e-mails de trial: guarda triggers já enviados
ALTER TABLE "Subscription"
  ADD COLUMN "notifiedTriggers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
