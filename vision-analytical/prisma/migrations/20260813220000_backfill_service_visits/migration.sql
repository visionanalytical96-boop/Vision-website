-- Give every already-assigned service request a visit.
--
-- The engineer portal reads visits from here on. Without this backfill an
-- engineer with a job assigned yesterday would open the app today and find it
-- gone -- the request still exists, but nothing renders it.
--
-- Only requests that actually have an engineer get a visit: an unassigned
-- request has no trip to site yet, and inventing one would put a job in
-- nobody's list while looking assigned in reports.

INSERT INTO "ServiceVisit" (
  "id",
  "visitNumber",
  "serviceRequestId",
  "engineerId",
  "customerInstrumentId",
  "status",
  "statusNote",
  "closedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  -- Derived from the ticket number rather than random, so an engineer holding
  -- a printed job card can match the two by eye. Unique because ticketNumber
  -- is, and it already uses the read-aloud-safe alphabet.
  'VST-' || substring(sr."ticketNumber" from 4),
  sr."id",
  sr."assignedEngineerId",
  sr."customerInstrumentId",
  CASE sr."status"
    WHEN 'IN_PROGRESS' THEN 'WORK_STARTED'::"VisitStatus"
    WHEN 'COMPLETED'   THEN 'CLOSED'::"VisitStatus"
    WHEN 'CLOSED'      THEN 'CLOSED'::"VisitStatus"
    WHEN 'CANCELLED'   THEN 'CANCELLED'::"VisitStatus"
    ELSE 'ASSIGNED'::"VisitStatus"
  END,
  'Created from the existing service request when visit tracking was introduced.',
  -- The only timestamp we actually know. The rest stay NULL rather than being
  -- back-dated to a time nobody recorded.
  sr."resolvedAt",
  sr."createdAt",
  now()
FROM "ServiceRequest" sr
WHERE sr."assignedEngineerId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ServiceVisit" v WHERE v."serviceRequestId" = sr."id");

-- Seed each backfilled visit's timeline, so the history says where the state
-- came from instead of appearing to have always been there.
INSERT INTO "VisitEvent" ("id", "visitId", "status", "note", "actorId", "actorLabel", "createdAt")
SELECT
  gen_random_uuid()::text,
  v."id",
  v."status",
  'Carried over from service request ' || sr."ticketNumber" || '.',
  NULL,
  'System',
  v."createdAt"
FROM "ServiceVisit" v
JOIN "ServiceRequest" sr ON sr."id" = v."serviceRequestId"
WHERE v."statusNote" = 'Created from the existing service request when visit tracking was introduced.'
  AND NOT EXISTS (SELECT 1 FROM "VisitEvent" e WHERE e."visitId" = v."id");

-- Every assigned request must now be visible to its engineer. If one is not,
-- the portal would silently hide work, so fail the migration instead.
DO $$
DECLARE orphaned INT;
BEGIN
  SELECT count(*) INTO orphaned
    FROM "ServiceRequest" sr
   WHERE sr."assignedEngineerId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "ServiceVisit" v WHERE v."serviceRequestId" = sr."id");

  IF orphaned > 0 THEN
    RAISE EXCEPTION 'Refusing to finish: % assigned request(s) still have no visit and would disappear from the engineer portal', orphaned;
  END IF;
END $$;
