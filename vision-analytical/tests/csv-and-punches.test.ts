import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '@/lib/csv';
import { parsePunchCsv } from '@/lib/punch-csv';
import { PunchDirection } from '@/generated/prisma/enums';
import { diffFields } from '@/lib/audit-diff';

const IST = 'Asia/Kolkata';

test('csv escapes the characters that would break a row', () => {
  assert.ok(toCsv(['a'], [['x,y']]).includes('"x,y"'));
  assert.ok(toCsv(['a'], [['say "hi"']]).includes('"say ""hi"""'));
  assert.ok(toCsv(['a'], [['line\nbreak']]).includes('"line\nbreak"'));
});

test('csv neutralises cells a spreadsheet would run as a formula', () => {
  // Employee names and free-text notes end up in these exports, and a cell
  // starting with =, +, - or @ executes when the file is opened.
  for (const dangerous of ['=1+1', '+1', '-cmd', '@SUM(A1)']) {
    assert.ok(toCsv(['a'], [[dangerous]]).includes(`'${dangerous}`), dangerous);
  }
});

test('punch import reads a header row', () => {
  const result = parsePunchCsv(
    'User ID,Date Time,Status\n101,2026-08-13 09:28:00,IN\n101,2026-08-13 18:35:00,OUT\n',
    IST,
  );
  assert.equal(result.errors.length, 0);
  assert.equal(result.punches.length, 2);
  assert.equal(result.punches[0].biometricId, '101');
  assert.equal(result.punches[0].direction, PunchDirection.IN);
  assert.equal(result.punches[1].direction, PunchDirection.OUT);
});

test('device timestamps are read as office time, not as UTC', () => {
  const result = parsePunchCsv('User ID,Date Time\n101,2026-08-13 09:28:00\n', IST);
  // 09:28 IST is 03:58 UTC. Handing the string to `new Date()` would store
  // 09:28 UTC and shift every punch by five and a half hours.
  assert.equal(result.punches[0].punchedAt.toISOString(), '2026-08-13T03:58:00.000Z');
});

test('an explicit offset in the file is honoured', () => {
  const result = parsePunchCsv('User ID,Date Time\n101,2026-08-13T09:28:00+05:30\n', IST);
  assert.equal(result.punches[0].punchedAt.toISOString(), '2026-08-13T03:58:00.000Z');
});

test('punch import falls back to column position when there is no header', () => {
  const result = parsePunchCsv('101,2026-08-13 09:28,0\n102,2026-08-13 09:31,0\n', IST);
  assert.equal(result.punches.length, 2);
  assert.equal(result.punches[0].direction, PunchDirection.IN);
});

test('bad rows are reported, not thrown - one blank line must not fail an import', () => {
  const result = parsePunchCsv(
    'User ID,Date Time\n101,2026-08-13 09:28:00\n,2026-08-13 09:30:00\n102,not a date\n',
    IST,
  );
  assert.equal(result.punches.length, 1);
  assert.equal(result.errors.length, 2);
  assert.equal(result.errors[0].line, 3);
});

test('quoted cells survive an embedded separator', () => {
  const result = parsePunchCsv('User ID,Date Time,Note\n"1,01",2026-08-13 09:28:00,"a, b"\n', IST);
  assert.equal(result.punches[0].biometricId, '1,01');
});

test('the audit diff reports only what changed', () => {
  const changes = diffFields(
    { status: 'ABSENT', notes: 'x', workedMinutes: 0 },
    { status: 'PRESENT', notes: 'x', workedMinutes: 480 },
    { status: 'Status' },
  );
  assert.deepEqual(Object.keys(changes).sort(), ['Status', 'workedMinutes']);
  assert.deepEqual(changes.Status, { from: 'ABSENT', to: 'PRESENT' });
});

test('the audit diff renders empty values as a dash rather than dropping them', () => {
  const changes = diffFields({ note: null as string | null }, { note: 'Forgot to punch out' });
  assert.deepEqual(changes.note, { from: '—', to: 'Forgot to punch out' });
});
