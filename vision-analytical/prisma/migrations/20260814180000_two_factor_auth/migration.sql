-- Two-factor authentication.
--
-- All three columns are nullable or default to empty, so every existing
-- account keeps signing in with a password alone until its owner chooses to
-- turn this on. Nothing about the current login path changes for anyone who
-- does not enrol.

ALTER TABLE "User"
  ADD COLUMN "twoFactorSecret"         TEXT,
  ADD COLUMN "twoFactorEnabledAt"      TIMESTAMP(3),
  ADD COLUMN "twoFactorRecoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[];
