import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAttendance, isWeeklyOff, daysWorked, type AttendancePolicy } from '@/lib/attendance';
import { AttendanceStatus, PunchDirection } from '@/generated/prisma/enums';
import {
  localDayKey,
  localMinutesOfDay,
  localWallClockToInstant,
  parseClockTime,
  formatClockTime,
  formatDuration,
  dayKeyToDate,
  dateToDayKey,
  dayKeyWeekday,
  addDays,
  dayKeyRange,
} from '@/lib/time-zone';

/**
 * The attendance engine decides what someone gets paid for a day, so its
 * behaviour is pinned here rather than left to be rediscovered by whoever next
 * changes a threshold.
 */

const IST = 'Asia/Kolkata';

const policy: AttendancePolicy = {
  timezone: IST,
  officeStartTime: '09:30',
  officeEndTime: '18:30',
  graceMinutes: 10,
  halfDayAfterMinutes: 120,
  fullDayMinutes: 480,
  halfDayMinutes: 240,
  overtimeAfterMinutes: 540,
  weeklyOffDays: [0],
};

/** A wall-clock time on 13 Aug 2026 in the office's zone. */
const at = (clock: string) => localWallClockToInstant('2026-08-13', parseClockTime(clock) as number, IST);
const punchIn = (clock: string) => ({ punchedAt: at(clock), direction: PunchDirection.IN });
const punchOut = (clock: string) => ({ punchedAt: at(clock), direction: PunchDirection.OUT });

test('a local day is read in the office zone, not the server zone', () => {
  assert.equal(localDayKey(new Date('2026-08-13T03:30:00Z'), IST), '2026-08-13');
  // 20:00 UTC on the 12th is already 01:30 on the 13th in IST. A server that
  // used its own clock would file this punch against the wrong day.
  assert.equal(localDayKey(new Date('2026-08-12T20:00:00Z'), IST), '2026-08-13');
});

test('wall-clock helpers round trip', () => {
  assert.equal(localMinutesOfDay(new Date('2026-08-13T04:00:00Z'), IST), 570);
  assert.equal(localWallClockToInstant('2026-08-13', 570, IST).toISOString(), '2026-08-13T04:00:00.000Z');
  assert.equal(dateToDayKey(dayKeyToDate('2026-08-13')), '2026-08-13');
});

test('wall-clock conversion holds on a daylight-saving changeover', () => {
  // The UK moves its clocks forward on 29 March 2026; 10:00 local must still
  // read back as 10:00 whatever the offset did that morning.
  const instant = localWallClockToInstant('2026-03-29', 600, 'Europe/London');
  assert.equal(localMinutesOfDay(instant, 'Europe/London'), 600);
});

test('clock parsing and formatting', () => {
  assert.equal(parseClockTime('09:30'), 570);
  assert.equal(parseClockTime('00:00'), 0);
  assert.equal(parseClockTime('25:00'), null);
  assert.equal(parseClockTime('9-30'), null);
  assert.equal(formatClockTime(570), '09:30');
  assert.equal(formatDuration(485), '8h 5m');
  assert.equal(formatDuration(480), '8h');
  assert.equal(formatDuration(0), '—');
});

test('calendar arithmetic', () => {
  assert.equal(dayKeyWeekday('2026-08-16'), 0, '16 Aug 2026 is a Sunday');
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
  assert.equal(dayKeyRange('2026-08-01', '2026-08-05').length, 5);
  assert.equal(dayKeyRange('2026-08-05', '2026-08-01').length, 0);
  assert.ok(isWeeklyOff('2026-08-16', policy));
  assert.ok(!isWeeklyOff('2026-08-13', policy));
});

test('a full day on time is present, with overtime past the threshold', () => {
  const day = deriveAttendance({ dayKey: '2026-08-13', punches: [punchIn('09:28'), punchOut('18:35')], policy });
  assert.equal(day.status, AttendanceStatus.PRESENT);
  assert.equal(day.workedMinutes, 547);
  assert.equal(day.lateMinutes, 0);
  assert.equal(day.overtimeMinutes, 7);
});

test('arriving inside the grace period is not late', () => {
  const day = deriveAttendance({ dayKey: '2026-08-13', punches: [punchIn('09:39'), punchOut('18:30')], policy });
  assert.equal(day.status, AttendanceStatus.PRESENT);
  assert.equal(day.lateMinutes, 0);
});

test('lateness is measured from the end of the grace period', () => {
  const day = deriveAttendance({ dayKey: '2026-08-13', punches: [punchIn('10:05'), punchOut('18:45')], policy });
  assert.equal(day.status, AttendanceStatus.LATE);
  assert.equal(day.lateMinutes, 25);
});

test('arriving very late costs half the day even if the hours are made up', () => {
  const day = deriveAttendance({ dayKey: '2026-08-13', punches: [punchIn('12:00'), punchOut('21:00')], policy });
  assert.equal(day.status, AttendanceStatus.HALF_DAY);
});

test('a short day is a half day, and a very short one does not count', () => {
  const half = deriveAttendance({ dayKey: '2026-08-13', punches: [punchIn('09:30'), punchOut('14:00')], policy });
  assert.equal(half.status, AttendanceStatus.HALF_DAY);

  const tooShort = deriveAttendance({ dayKey: '2026-08-13', punches: [punchIn('09:30'), punchOut('10:30')], policy });
  assert.equal(tooShort.status, AttendanceStatus.ABSENT);
  // The status says the day doesn't count; the row still records what happened.
  assert.equal(tooShort.workedMinutes, 60);
});

test('a mid-day exit is deducted when the device reports direction', () => {
  const day = deriveAttendance({
    dayKey: '2026-08-13',
    punches: [punchIn('09:30'), punchOut('12:00'), punchIn('14:00'), punchOut('18:30')],
    policy,
  });
  assert.equal(day.workedMinutes, 150 + 270);
});

test('without directions the reading is first punch to last', () => {
  const scan = (clock: string) => ({ punchedAt: at(clock), direction: PunchDirection.UNKNOWN });
  const day = deriveAttendance({
    dayKey: '2026-08-13',
    punches: [scan('09:30'), scan('12:00'), scan('18:30')],
    policy,
  });
  assert.equal(day.workedMinutes, 540);
});

test('a double scan on the way in does not shorten the day', () => {
  const day = deriveAttendance({
    dayKey: '2026-08-13',
    punches: [punchIn('09:30'), punchIn('09:31'), punchOut('18:30')],
    policy,
  });
  assert.equal(day.workedMinutes, 540);
});

test('a day with no punches takes its status from the calendar', () => {
  assert.equal(deriveAttendance({ dayKey: '2026-08-13', punches: [], policy }).status, AttendanceStatus.ABSENT);
  assert.equal(deriveAttendance({ dayKey: '2026-08-16', punches: [], policy }).status, AttendanceStatus.WEEKLY_OFF);
  assert.equal(
    deriveAttendance({ dayKey: '2026-08-13', punches: [], policy, isHoliday: true }).status,
    AttendanceStatus.HOLIDAY,
  );
  assert.equal(
    deriveAttendance({ dayKey: '2026-08-13', punches: [], policy, isOnLeave: true }).status,
    AttendanceStatus.ON_LEAVE,
  );
});

test('working a holiday keeps the day a holiday and counts every minute as overtime', () => {
  const day = deriveAttendance({
    dayKey: '2026-08-13',
    punches: [punchIn('10:00'), punchOut('14:00')],
    policy,
    isHoliday: true,
  });
  assert.equal(day.status, AttendanceStatus.HOLIDAY);
  assert.equal(day.workedMinutes, 240);
  assert.equal(day.overtimeMinutes, 240);
  assert.equal(day.lateMinutes, 0);
});

test('days worked counts attendance, not pay', () => {
  assert.equal(daysWorked(AttendanceStatus.PRESENT), 1);
  assert.equal(daysWorked(AttendanceStatus.LATE), 1);
  assert.equal(daysWorked(AttendanceStatus.HALF_DAY), 0.5);
  // Paid leave is worth a day in payroll and zero here on purpose: whether it
  // is paid lives on the leave type.
  assert.equal(daysWorked(AttendanceStatus.ON_LEAVE), 0);
  assert.equal(daysWorked(AttendanceStatus.ABSENT), 0);
});
