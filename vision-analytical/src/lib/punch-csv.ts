import { PunchDirection } from '@/generated/prisma/enums';
import { localWallClockToInstant, parseClockTime } from '@/lib/time-zone';

/**
 * Reading a device's punch export.
 *
 * Kept apart from the sync module, which is `server-only` because it touches
 * the database. Parsing is pure: same text in, same punches out, no I/O - which
 * is what lets it be tested directly against the awkward exports real devices
 * produce.
 */

export interface ParsedPunch {
  biometricId: string;
  punchedAt: Date;
  direction: PunchDirection;
}

export interface PunchParseResult {
  punches: ParsedPunch[];
  errors: Array<{ line: number; reason: string }>;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',' || char === ';' || char === '\t') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseDirection(value: string | undefined): PunchDirection {
  const normalised = (value ?? '').trim().toUpperCase();
  if (normalised === 'IN' || normalised === 'I' || normalised === '0' || normalised === 'CHECK-IN' || normalised === 'CHECKIN') {
    return PunchDirection.IN;
  }
  if (
    normalised === 'OUT' ||
    normalised === 'O' ||
    normalised === '1' ||
    normalised === 'CHECK-OUT' ||
    normalised === 'CHECKOUT'
  ) {
    return PunchDirection.OUT;
  }
  return PunchDirection.UNKNOWN;
}

/**
 * Reads a timestamp the way the device wrote it.
 *
 * Device exports carry wall-clock time with no zone, so the string is
 * interpreted in the office's zone rather than handed to `new Date()`, which
 * would silently read it as the server's UTC and shift every punch by hours.
 * An explicit offset in the string is honoured when present.
 */
function parseDeviceTimestamp(raw: string, timeZone: string): Date | null {
  const value = raw.trim();
  if (value === '') return null;

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T ]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const dayKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const minutesOfDay = parseClockTime(`${hour.padStart(2, '0')}:${minute}`);
  if (minutesOfDay === null) return null;

  return localWallClockToInstant(dayKey, minutesOfDay, timeZone);
}

/**
 * Parses a device export.
 *
 * Column order varies between exports, so a header row is used when one is
 * present and position is the fallback. Bad lines are collected rather than
 * thrown: an import of 900 rows should not fail because row 400 is blank.
 */
export function parsePunchCsv(text: string, timeZone: string): PunchParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const punches: ParsedPunch[] = [];
  const errors: Array<{ line: number; reason: string }> = [];
  if (lines.length === 0) return { punches, errors };

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const findColumn = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.includes(name)));

  const idColumn = findColumn('biometric', 'user id', 'userid', 'employee id', 'enroll', 'emp code', 'id');
  const timeColumn = findColumn('date', 'time', 'punch');
  const directionColumn = findColumn('direction', 'status', 'in/out', 'type', 'mode');
  const hasHeader = idColumn !== -1 && timeColumn !== -1;

  const columns = hasHeader
    ? { id: idColumn, time: timeColumn, direction: directionColumn }
    : { id: 0, time: 1, direction: 2 };

  for (const [index, line] of lines.entries()) {
    if (hasHeader && index === 0) continue;
    const lineNumber = index + 1;
    const cells = splitCsvLine(line);

    const biometricId = (cells[columns.id] ?? '').trim();
    if (biometricId === '') {
      errors.push({ line: lineNumber, reason: 'No device user ID in this row.' });
      continue;
    }

    const punchedAt = parseDeviceTimestamp(cells[columns.time] ?? '', timeZone);
    if (!punchedAt) {
      errors.push({ line: lineNumber, reason: `Could not read the time "${cells[columns.time] ?? ''}".` });
      continue;
    }

    punches.push({
      biometricId,
      punchedAt,
      direction: parseDirection(columns.direction === -1 ? undefined : cells[columns.direction]),
    });
  }

  return { punches, errors };
}
