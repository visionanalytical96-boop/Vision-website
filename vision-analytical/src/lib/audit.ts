import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import type { FieldChange } from '@/lib/audit-diff';

// Re-exported so callers have one import for the audit trail.
export { diffFields, type FieldChange } from '@/lib/audit-diff';

/**
 * Platform-wide audit trail.
 *
 * Attendance edits must be logged - an attendance record is a claim about a
 * person's pay, and "who changed this" has to be answerable months later. So
 * writes go through the same transaction as the change itself: if the log
 * can't be written the change doesn't happen, rather than leaving an
 * unexplained edit behind.
 */

/** Either the client or a transaction handle, so callers can be atomic. */
export type AuditDb = typeof prisma | Prisma.TransactionClient;

export interface AuditEntry {
  actorId: string | null;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes?: Record<string, FieldChange>;
}

export async function recordAudit(entry: AuditEntry, db: AuditDb = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorLabel: entry.actorLabel,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      changes:
        entry.changes && Object.keys(entry.changes).length > 0
          ? (entry.changes as unknown as Prisma.InputJsonValue)
          : undefined,
    },
  });
}
