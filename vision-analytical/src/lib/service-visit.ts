import { VisitStatus, ServiceRequestStatus } from '@/generated/prisma/enums';
import type { BadgeTone } from '@/components/ui/Badge';

/**
 * The lifecycle of one visit to site.
 *
 * A state machine rather than a free `status` field: an engineer cannot check
 * out of a site they never reached, and a job cannot close with no work
 * recorded. Encoding that here means the rule is enforced once, in the action,
 * instead of being re-implemented differently on every screen and phone.
 */

export interface VisitStatusMeta {
  label: string;
  tone: BadgeTone;
  /** What the engineer sees on the button that moves the job here. */
  action: string;
  description: string;
}

export const visitStatusMeta: Record<VisitStatus, VisitStatusMeta> = {
  ASSIGNED: {
    label: 'Assigned',
    tone: 'info',
    action: 'Assign',
    description: 'Waiting for the engineer to accept.',
  },
  ACCEPTED: {
    label: 'Accepted',
    tone: 'info',
    action: 'Accept job',
    description: 'The engineer has taken the job.',
  },
  REJECTED: {
    label: 'Declined',
    tone: 'danger',
    action: 'Decline',
    description: 'The engineer cannot take it. Needs reassigning.',
  },
  TRAVELLING: {
    label: 'Travelling',
    tone: 'warning',
    action: 'Start travel',
    description: 'On the way to site.',
  },
  REACHED_SITE: {
    label: 'On site',
    tone: 'warning',
    action: 'Check in',
    description: 'Arrived. Check-in records where and when.',
  },
  WORK_STARTED: {
    label: 'Working',
    tone: 'warning',
    action: 'Start work',
    description: 'Work in progress.',
  },
  WAITING_FOR_PARTS: {
    label: 'Waiting for parts',
    tone: 'danger',
    action: 'Hold for parts',
    description: 'Paused until a part arrives. Usually needs a second visit.',
  },
  WORK_COMPLETED: {
    label: 'Work complete',
    tone: 'success',
    action: 'Complete work',
    description: 'Finished on site. The report is what closes it.',
  },
  AWAITING_CUSTOMER_APPROVAL: {
    label: 'Awaiting sign-off',
    tone: 'warning',
    action: 'Send for sign-off',
    description: 'Waiting for the customer to sign.',
  },
  CLOSED: {
    label: 'Closed',
    tone: 'success',
    action: 'Close job',
    description: 'Signed off and done.',
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'neutral',
    action: 'Cancel',
    description: 'Called off before completion.',
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    tone: 'neutral',
    action: 'Reschedule',
    description: 'Moved to another date. A fresh visit takes over.',
  },
};

/**
 * Where each state can legally go next.
 *
 * Deliberately not a straight line. Two loops matter in the field: waiting for
 * a part goes back to working when the part arrives, and a customer who
 * refuses to sign sends the engineer back to the bench rather than closing the
 * job anyway.
 */
const TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  ASSIGNED: [VisitStatus.ACCEPTED, VisitStatus.REJECTED, VisitStatus.RESCHEDULED, VisitStatus.CANCELLED],
  ACCEPTED: [VisitStatus.TRAVELLING, VisitStatus.RESCHEDULED, VisitStatus.CANCELLED],
  TRAVELLING: [VisitStatus.REACHED_SITE, VisitStatus.RESCHEDULED, VisitStatus.CANCELLED],
  REACHED_SITE: [VisitStatus.WORK_STARTED, VisitStatus.CANCELLED],
  WORK_STARTED: [VisitStatus.WAITING_FOR_PARTS, VisitStatus.WORK_COMPLETED],
  WAITING_FOR_PARTS: [VisitStatus.WORK_STARTED, VisitStatus.WORK_COMPLETED, VisitStatus.RESCHEDULED],
  WORK_COMPLETED: [VisitStatus.AWAITING_CUSTOMER_APPROVAL, VisitStatus.CLOSED],
  // A customer who will not sign sends it back to the bench.
  AWAITING_CUSTOMER_APPROVAL: [VisitStatus.CLOSED, VisitStatus.WORK_STARTED],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
  // The visit is finished; a new one carries the rebooked job.
  RESCHEDULED: [],
};

/** States after which nothing more happens on this visit. */
export const TERMINAL_STATUSES: VisitStatus[] = [
  VisitStatus.CLOSED,
  VisitStatus.REJECTED,
  VisitStatus.CANCELLED,
  VisitStatus.RESCHEDULED,
];

/** States where the engineer is actively on this job today. */
export const ACTIVE_STATUSES: VisitStatus[] = [
  VisitStatus.ASSIGNED,
  VisitStatus.ACCEPTED,
  VisitStatus.TRAVELLING,
  VisitStatus.REACHED_SITE,
  VisitStatus.WORK_STARTED,
  VisitStatus.WAITING_FOR_PARTS,
  VisitStatus.WORK_COMPLETED,
  VisitStatus.AWAITING_CUSTOMER_APPROVAL,
];

export function nextStatuses(current: VisitStatus): VisitStatus[] {
  return TRANSITIONS[current];
}

export function isTerminal(status: VisitStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Transitions where "why" is the whole point of the record. */
const NOTE_REQUIRED: VisitStatus[] = [
  VisitStatus.REJECTED,
  VisitStatus.CANCELLED,
  VisitStatus.RESCHEDULED,
  VisitStatus.WAITING_FOR_PARTS,
];

export function requiresNote(target: VisitStatus): boolean {
  return NOTE_REQUIRED.includes(target);
}

/** Transitions that are evidence of being somewhere, so they carry a fix. */
export function expectsLocation(target: VisitStatus): boolean {
  return target === VisitStatus.REACHED_SITE || target === VisitStatus.WORK_COMPLETED;
}

export interface TransitionCheck {
  ok: boolean;
  error?: string;
}

/**
 * Whether a visit may move to `target`, and why not if it may not.
 *
 * The messages name the missing step rather than saying "invalid transition",
 * because the person reading it is standing in a customer's lab holding a
 * phone.
 */
export function canTransition(
  current: VisitStatus,
  target: VisitStatus,
  options: { note?: string } = {},
): TransitionCheck {
  if (current === target) {
    return { ok: false, error: `This job is already ${visitStatusMeta[target].label.toLowerCase()}.` };
  }

  if (isTerminal(current)) {
    return {
      ok: false,
      error: `This visit is ${visitStatusMeta[current].label.toLowerCase()} and cannot be changed. Create a new visit instead.`,
    };
  }

  if (!TRANSITIONS[current].includes(target)) {
    const allowed = TRANSITIONS[current].map((status) => visitStatusMeta[status].label);
    return {
      ok: false,
      error:
        allowed.length === 0
          ? `Nothing follows ${visitStatusMeta[current].label.toLowerCase()}.`
          : `A job that is ${visitStatusMeta[current].label.toLowerCase()} can only go to: ${allowed.join(', ')}.`,
    };
  }

  if (requiresNote(target) && !options.note?.trim()) {
    return { ok: false, error: `Say why before marking this ${visitStatusMeta[target].label.toLowerCase()}.` };
  }

  return { ok: true };
}

/**
 * Which timestamp column a transition stamps.
 *
 * Kept beside the transition table so adding a state cannot leave its time
 * unrecorded — the two are read together.
 */
export function timestampField(target: VisitStatus): string | null {
  switch (target) {
    case VisitStatus.ACCEPTED:
      return 'acceptedAt';
    case VisitStatus.TRAVELLING:
      return 'travelStartedAt';
    case VisitStatus.REACHED_SITE:
      return 'checkInAt';
    case VisitStatus.WORK_STARTED:
      return 'workStartedAt';
    case VisitStatus.WORK_COMPLETED:
      return 'workCompletedAt';
    case VisitStatus.CLOSED:
      return 'closedAt';
    default:
      return null;
  }
}

/**
 * What the parent ticket's status should be, given the visits under it.
 *
 * The ticket and the visit are not the same thing, and the customer only ever
 * sees the ticket. Deriving one from the other keeps them from disagreeing —
 * the alternative is two status fields updated by hand in different places,
 * which is how a customer ends up reading "Open" about a job that finished
 * last week.
 *
 * `null` means leave it alone: the request is in a state only an admin owns.
 */
export function requestStatusForVisits(
  visitStatuses: VisitStatus[],
  currentRequestStatus: ServiceRequestStatus,
): ServiceRequestStatus | null {
  // Cancelling or closing a ticket is an office decision, not a field one.
  if (currentRequestStatus === ServiceRequestStatus.CANCELLED || currentRequestStatus === ServiceRequestStatus.CLOSED) {
    return null;
  }

  if (visitStatuses.includes(VisitStatus.CLOSED)) return ServiceRequestStatus.COMPLETED;

  const inTheField = visitStatuses.some(
    (status) => ACTIVE_STATUSES.includes(status) && status !== VisitStatus.ASSIGNED,
  );
  if (inTheField) return ServiceRequestStatus.IN_PROGRESS;

  if (visitStatuses.includes(VisitStatus.ASSIGNED)) return ServiceRequestStatus.ASSIGNED;

  // Every visit was declined, cancelled or rebooked. The work still needs
  // doing, so the ticket goes back to the unassigned queue rather than sitting
  // in a state with nobody working it.
  return ServiceRequestStatus.OPEN;
}

/**
 * A GPS fix is only evidence if it is accurate enough to be.
 *
 * A reading good to 2km places the engineer somewhere in the city, which
 * proves nothing about whether they were on site. Recorded either way, but
 * flagged, so nobody later mistakes a vague fix for confirmation.
 */
export const GPS_TRUSTWORTHY_ACCURACY_M = 100;

export function isLocationTrustworthy(accuracyM: number | null | undefined): boolean {
  return typeof accuracyM === 'number' && accuracyM > 0 && accuracyM <= GPS_TRUSTWORTHY_ACCURACY_M;
}

/**
 * Distance between two fixes in kilometres, by the haversine formula.
 *
 * For "is the engineer near the site", not for mileage: the straight line
 * between two points is not the road, and nobody is reimbursed for it.
 */
export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Minutes between two instants, or null when either is missing. */
export function minutesBetween(from: Date | null | undefined, to: Date | null | undefined): number | null {
  if (!from || !to) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}
