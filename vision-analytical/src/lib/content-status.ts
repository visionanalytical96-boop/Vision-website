import { ContentStatus } from '@/generated/prisma/enums';
import type { StatusMeta } from '@/lib/status';

export const CONTENT_STATUSES = Object.values(ContentStatus);

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

/** Uses the shared StatusMeta shape so it renders through the same badge. */
export const contentStatusMeta: Record<ContentStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  IN_REVIEW: { label: 'In review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'info' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

export function isContentStatus(value: string | undefined): value is ContentStatus {
  return CONTENT_STATUSES.some((status) => status === value);
}

/**
 * The single definition of "the public can see this".
 *
 * Scheduling is a query condition rather than a timer: a post is live when it
 * is PUBLISHED and its publishAt has passed. Nothing has to run on a cron for
 * a scheduled post to appear, and nothing can get stuck half-published if a
 * job runner dies.
 */
export function publiclyVisibleWhere(now: Date = new Date()) {
  return {
    status: ContentStatus.PUBLISHED,
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
  };
}

/** True when the status/publishAt pair means "scheduled, not yet live". */
export function isScheduled(status: ContentStatus, publishAt: Date | null, now: Date = new Date()): boolean {
  return status === ContentStatus.PUBLISHED && publishAt !== null && publishAt > now;
}
