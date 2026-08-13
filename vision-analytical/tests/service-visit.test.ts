import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VisitStatus, ServiceRequestStatus } from '@/generated/prisma/enums';
import {
  visitStatusMeta,
  nextStatuses,
  canTransition,
  isTerminal,
  requiresNote,
  expectsLocation,
  timestampField,
  isLocationTrustworthy,
  requestStatusForVisits,
  distanceKm,
  minutesBetween,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  GPS_TRUSTWORTHY_ACCURACY_M,
} from '@/lib/service-visit';

const ALL_STATUSES = Object.values(VisitStatus);

test('every status is either active or terminal, and never both', () => {
  // The invariant that keeps the dashboard honest: "my open jobs" is
  // ACTIVE_STATUSES, so a status nobody classified would silently vanish from
  // every engineer's list. Adding a state to the enum fails here until it is
  // put on one side or the other.
  for (const status of ALL_STATUSES) {
    const active = ACTIVE_STATUSES.includes(status);
    const terminal = TERMINAL_STATUSES.includes(status);
    assert.equal(active !== terminal, true, `${status} is ${active && terminal ? 'both' : 'neither'}`);
  }
  assert.equal(ACTIVE_STATUSES.length + TERMINAL_STATUSES.length, ALL_STATUSES.length);
});

test('every status has a label, and no two share one', () => {
  const labels = ALL_STATUSES.map((status) => visitStatusMeta[status].label);
  for (const label of labels) assert.ok(label.length > 0);
  assert.equal(new Set(labels).size, labels.length, 'two states reading the same on screen is a bug');
});

test('the happy path runs assigned to closed', () => {
  const path: VisitStatus[] = [
    VisitStatus.ASSIGNED,
    VisitStatus.ACCEPTED,
    VisitStatus.TRAVELLING,
    VisitStatus.REACHED_SITE,
    VisitStatus.WORK_STARTED,
    VisitStatus.WORK_COMPLETED,
    VisitStatus.AWAITING_CUSTOMER_APPROVAL,
    VisitStatus.CLOSED,
  ];

  for (let i = 0; i < path.length - 1; i += 1) {
    const check = canTransition(path[i], path[i + 1]);
    assert.equal(check.ok, true, `${path[i]} -> ${path[i + 1]}: ${check.error}`);
  }
});

test('a part that arrives sends the job back to working', () => {
  // The first of the two loops that make this not a straight line. Without it
  // a held job could only be closed or cancelled, and the engineer who
  // returns with the part would have to raise a new visit for the same trip.
  assert.equal(canTransition(VisitStatus.WORK_STARTED, VisitStatus.WAITING_FOR_PARTS, { note: 'Lamp on order' }).ok, true);
  assert.equal(canTransition(VisitStatus.WAITING_FOR_PARTS, VisitStatus.WORK_STARTED).ok, true);
});

test('a customer who will not sign sends the job back to the bench', () => {
  // The second loop. Closing anyway would record a signature that does not
  // exist.
  assert.equal(canTransition(VisitStatus.AWAITING_CUSTOMER_APPROVAL, VisitStatus.WORK_STARTED).ok, true);
});

test('work cannot start before the engineer reaches site', () => {
  const check = canTransition(VisitStatus.ACCEPTED, VisitStatus.WORK_STARTED);
  assert.equal(check.ok, false);
  assert.match(check.error ?? '', /Travelling/);
});

test('a job cannot close straight from assigned', () => {
  assert.equal(canTransition(VisitStatus.ASSIGNED, VisitStatus.CLOSED).ok, false);
  assert.equal(canTransition(VisitStatus.ASSIGNED, VisitStatus.WORK_COMPLETED).ok, false);
});

test('a check-out cannot happen without a check-in', () => {
  // REACHED_SITE is the only route into WORK_COMPLETED, so the completion
  // timestamp always has an arrival before it.
  for (const status of ALL_STATUSES) {
    if (!nextStatuses(status).includes(VisitStatus.WORK_COMPLETED)) continue;
    const allowedPredecessors: VisitStatus[] = [VisitStatus.WORK_STARTED, VisitStatus.WAITING_FOR_PARTS];
    assert.ok(allowedPredecessors.includes(status), `${status} should not lead straight to work completed`);
  }
});

test('nothing follows a terminal state', () => {
  for (const status of TERMINAL_STATUSES) {
    assert.deepEqual(nextStatuses(status), [], `${status} has an exit`);
    assert.equal(isTerminal(status), true);

    const check = canTransition(status, VisitStatus.WORK_STARTED);
    assert.equal(check.ok, false);
    assert.match(check.error ?? '', /new visit/, 'the message should say what to do instead');
  }
});

test('a job cannot transition to the state it is already in', () => {
  const check = canTransition(VisitStatus.WORK_STARTED, VisitStatus.WORK_STARTED);
  assert.equal(check.ok, false);
  assert.match(check.error ?? '', /already/);
});

test('the transitions that need a reason refuse to move without one', () => {
  const cases: Array<[VisitStatus, VisitStatus]> = [
    [VisitStatus.ASSIGNED, VisitStatus.REJECTED],
    [VisitStatus.ASSIGNED, VisitStatus.CANCELLED],
    [VisitStatus.ACCEPTED, VisitStatus.RESCHEDULED],
    [VisitStatus.WORK_STARTED, VisitStatus.WAITING_FOR_PARTS],
  ];

  for (const [from, to] of cases) {
    assert.equal(requiresNote(to), true, `${to} should need a reason`);
    assert.equal(canTransition(from, to).ok, false, `${from} -> ${to} passed with no reason`);
    assert.equal(canTransition(from, to, { note: '   ' }).ok, false, 'whitespace is not a reason');
    assert.equal(canTransition(from, to, { note: 'Customer postponed' }).ok, true);
  }
});

test('ordinary progress needs no explanation', () => {
  assert.equal(requiresNote(VisitStatus.ACCEPTED), false);
  assert.equal(requiresNote(VisitStatus.WORK_STARTED), false);
  assert.equal(canTransition(VisitStatus.ASSIGNED, VisitStatus.ACCEPTED).ok, true);
});

test('only the two states that prove presence ask for a location', () => {
  const expecting = ALL_STATUSES.filter(expectsLocation);
  assert.deepEqual(expecting.sort(), [VisitStatus.REACHED_SITE, VisitStatus.WORK_COMPLETED].sort());
});

test('every stamped timestamp is a real column on ServiceVisit', () => {
  // Catches the rename that Prisma would otherwise only report at runtime,
  // in the field, mid-job.
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  const model = schema.match(/model ServiceVisit \{([\s\S]*?)\n\}/);
  assert.ok(model, 'ServiceVisit model not found in schema');

  const dateFields = new Set(
    [...model[1].matchAll(/^\s*(\w+)\s+DateTime\?/gm)].map((match) => match[1]),
  );

  const stamped = ALL_STATUSES.map(timestampField).filter((field): field is string => field !== null);
  for (const field of stamped) {
    assert.ok(dateFields.has(field), `${field} is not a nullable DateTime on ServiceVisit`);
  }
  assert.equal(new Set(stamped).size, stamped.length, 'two states writing one column would overwrite each other');
});

test('the ticket follows the work happening under it', () => {
  const open = ServiceRequestStatus.OPEN;

  assert.equal(requestStatusForVisits([VisitStatus.ASSIGNED], open), ServiceRequestStatus.ASSIGNED);
  assert.equal(requestStatusForVisits([VisitStatus.TRAVELLING], open), ServiceRequestStatus.IN_PROGRESS);
  assert.equal(requestStatusForVisits([VisitStatus.WORK_STARTED], open), ServiceRequestStatus.IN_PROGRESS);
  assert.equal(requestStatusForVisits([VisitStatus.CLOSED], open), ServiceRequestStatus.COMPLETED);
});

test('a ticket is not complete until the work is signed off', () => {
  // WORK_COMPLETED means the engineer packed up, not that the customer
  // accepted it. Reporting "Completed" to the customer at that point is a
  // claim we cannot back up, and it is the point the AMC visit counter moves.
  assert.equal(
    requestStatusForVisits([VisitStatus.WORK_COMPLETED], ServiceRequestStatus.OPEN),
    ServiceRequestStatus.IN_PROGRESS,
  );
  assert.equal(
    requestStatusForVisits([VisitStatus.AWAITING_CUSTOMER_APPROVAL], ServiceRequestStatus.OPEN),
    ServiceRequestStatus.IN_PROGRESS,
  );
});

test('a ticket with a finished visit stays finished even while a return trip runs', () => {
  // Second visit for the same fault: the ticket does not regress to
  // in-progress and un-count the AMC visit already used.
  assert.equal(
    requestStatusForVisits([VisitStatus.CLOSED, VisitStatus.WORK_STARTED], ServiceRequestStatus.IN_PROGRESS),
    ServiceRequestStatus.COMPLETED,
  );
});

test('a declined job goes back to the unassigned queue', () => {
  // Otherwise it sits assigned to someone who already said no, and nobody
  // notices until the customer calls.
  assert.equal(
    requestStatusForVisits([VisitStatus.REJECTED], ServiceRequestStatus.ASSIGNED),
    ServiceRequestStatus.OPEN,
  );
  assert.equal(
    requestStatusForVisits([VisitStatus.CANCELLED, VisitStatus.RESCHEDULED], ServiceRequestStatus.IN_PROGRESS),
    ServiceRequestStatus.OPEN,
  );
});

test('a ticket the office closed or cancelled is not reopened from the field', () => {
  for (const final of [ServiceRequestStatus.CLOSED, ServiceRequestStatus.CANCELLED]) {
    assert.equal(requestStatusForVisits([VisitStatus.WORK_STARTED], final), null);
    assert.equal(requestStatusForVisits([VisitStatus.REJECTED], final), null);
  }
});

test('a vague GPS fix is not treated as proof of being on site', () => {
  assert.equal(isLocationTrustworthy(12), true);
  assert.equal(isLocationTrustworthy(GPS_TRUSTWORTHY_ACCURACY_M), true, 'the boundary is inclusive');
  assert.equal(isLocationTrustworthy(GPS_TRUSTWORTHY_ACCURACY_M + 1), false);
  assert.equal(isLocationTrustworthy(2000), false, 'good to 2km is somewhere in the city, not on site');
  assert.equal(isLocationTrustworthy(null), false);
  assert.equal(isLocationTrustworthy(undefined), false);
  assert.equal(isLocationTrustworthy(0), false, 'a claimed accuracy of zero is a broken reading');
  assert.equal(isLocationTrustworthy(-5), false);
});

test('distance between two fixes is measured in kilometres', () => {
  const mumbai = { latitude: 19.076, longitude: 72.8777 };
  const pune = { latitude: 18.5204, longitude: 73.8567 };

  assert.equal(Math.round(distanceKm(mumbai, pune)), 120);
  assert.equal(distanceKm(mumbai, mumbai), 0);

  // A site check is a small-distance question, so the short end has to be right.
  const hundredMetresNorth = { latitude: 19.0769, longitude: 72.8777 };
  assert.ok(Math.abs(distanceKm(mumbai, hundredMetresNorth) - 0.1) < 0.005);
});

test('distance is the same in both directions', () => {
  const a = { latitude: 28.6139, longitude: 77.209 };
  const b = { latitude: 19.076, longitude: 72.8777 };
  assert.equal(distanceKm(a, b), distanceKm(b, a));
});

test('elapsed minutes are null until both ends exist', () => {
  const start = new Date('2026-08-13T09:00:00Z');
  const end = new Date('2026-08-13T11:30:00Z');

  assert.equal(minutesBetween(start, end), 150);
  assert.equal(minutesBetween(start, null), null);
  assert.equal(minutesBetween(null, end), null);
  assert.equal(minutesBetween(undefined, undefined), null);
});

test('a clock that runs backwards reports zero, not negative time', () => {
  // Phones report their own time and some of them are wrong. A negative
  // duration in a performance report is worse than a zero.
  const start = new Date('2026-08-13T11:00:00Z');
  const end = new Date('2026-08-13T09:00:00Z');
  assert.equal(minutesBetween(start, end), 0);
});
