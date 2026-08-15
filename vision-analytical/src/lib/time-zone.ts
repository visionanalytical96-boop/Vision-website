/**
 * Wall-clock helpers for an explicit IANA time zone.
 *
 * Attendance is a wall-clock policy: "09:30" means half past nine where the
 * office is, not where the server is. The server runs UTC inside Docker, so
 * every conversion here goes through the zone stored on the attendance rule
 * rather than the host's own idea of local time. Without that, a punch at
 * 01:00 IST would be filed against the previous day.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      // h23 rather than hour12:false - some engines render midnight as "24"
      // under the latter, which silently shifts a day.
      hourCycle: 'h23',
    });
    formatters.set(timeZone, cached);
  }
  return cached;
}

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = formatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

/** Whether a string is a time zone this runtime actually knows. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "2026-08-13" - the calendar day the instant falls on in `timeZone`. */
export function localDayKey(instant: Date, timeZone: string): string {
  const { year, month, day } = localParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Minutes since local midnight. 09:30 → 570. */
export function localMinutesOfDay(instant: Date, timeZone: string): number {
  const { hour, minute } = localParts(instant, timeZone);
  return hour * 60 + minute;
}

/**
 * The value to store in a `@db.Date` column for a local day.
 *
 * Prisma reads a DATE back as midnight UTC, so writing midnight UTC is what
 * makes a round-trip return the same day.
 */
export function dayKeyToDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** The inverse: a stored `@db.Date` back to "2026-08-13". */
export function dateToDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Day of week for a calendar day, 0 = Sunday, matching `weeklyOffDays`. */
export function dayKeyWeekday(dayKey: string): number {
  return dayKeyToDate(dayKey).getUTCDay();
}

/** "09:30" → 570. Returns null for anything that isn't a valid 24h clock time. */
export function parseClockTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 570 → "09:30". */
export function formatClockTime(minutesOfDay: number): string {
  const wrapped = ((minutesOfDay % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** "7h 45m" for a duration in minutes, or "—" for nothing worked. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** How far ahead of UTC `timeZone` is at a given instant, in minutes. */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = localParts(instant, timeZone);
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  // Floor to the minute: the parts have no seconds, so an unfloored instant
  // would leak them into the difference.
  const floored = Math.floor(instant.getTime() / 60000) * 60000;
  return (asIfUtc - floored) / 60000;
}

/**
 * The instant at which a wall-clock time occurs on a local day.
 *
 * Converged rather than calculated: the offset itself depends on the instant,
 * so we guess, measure the offset there, and correct. Two passes settle it for
 * every zone including the hour either side of a DST change.
 */
export function localWallClockToInstant(dayKey: string, minutesOfDay: number, timeZone: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, minutesOfDay);

  let guess = wallClockAsUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    const corrected = wallClockAsUtc - zoneOffsetMinutes(new Date(guess), timeZone) * 60000;
    if (corrected === guess) break;
    guess = corrected;
  }
  return new Date(guess);
}

/** Today's calendar day in `timeZone`. */
export function todayDayKey(timeZone: string, now: Date = new Date()): string {
  return localDayKey(now, timeZone);
}

/** Shifts a day key by whole days. `addDays('2026-08-13', -1)` → "2026-08-12". */
export function addDays(dayKey: string, days: number): string {
  const date = dayKeyToDate(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToDayKey(date);
}

/** Every day key from `from` to `to` inclusive. Empty when the range is backwards. */
export function dayKeyRange(from: string, to: string): string[] {
  const keys: string[] = [];
  let cursor = from;
  // A month of daily rows is the normal case; the cap stops a typo'd year
  // range from building a list of a hundred thousand strings.
  for (let guard = 0; guard < 400 && cursor <= to; guard += 1) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}
