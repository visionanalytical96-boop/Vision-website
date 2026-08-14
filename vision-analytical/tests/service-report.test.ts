import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportNumber,
  formatSheetDate,
  joinAddress,
  parseServiceCallTypes,
  toDateInputValue,
  SERVICE_CALL_TYPE_LABELS,
  SERVICE_CALL_TYPE_ORDER,
  SERVICE_CONTRACT_TYPE_LABELS,
  SERVICE_CONTRACT_TYPE_ORDER,
  SERVICE_OUTCOME_LABELS,
  SERVICE_OUTCOME_ORDER,
} from '../src/lib/service-report/form';

test('the printed date is dd/mm/yy, not the locale default', () => {
  assert.equal(formatSheetDate(new Date('2026-03-09T00:00:00.000Z')), '09/03/26');
  assert.equal(formatSheetDate(new Date('2026-12-31T00:00:00.000Z')), '31/12/26');
  assert.equal(formatSheetDate(null), '');
});

test('a date typed into the form survives the round trip unchanged', () => {
  // Parsed as UTC midnight by the schema, so the day cannot shift under a
  // timezone west of Greenwich and print as the day before.
  const parsed = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(toDateInputValue(parsed), '2026-01-01');
  assert.equal(formatSheetDate(parsed), '01/01/26');
});

test('the report number carries the year and month it was filed', () => {
  assert.equal(buildReportNumber(new Date('2026-08-14T00:00:00.000Z'), 'K7QP'), 'VA-SR-2608-K7QP');
  assert.equal(buildReportNumber(new Date('2026-01-05T00:00:00.000Z'), 'AB23'), 'VA-SR-2601-AB23');
});

test('tick boxes print in sheet order however they were clicked', () => {
  assert.deepEqual(parseServiceCallTypes(['REPAIRS', 'CALIBRATION']), [
    'CALIBRATION',
    'REPAIRS',
  ]);
});

test('a value that is not a tick box is dropped rather than printed', () => {
  assert.deepEqual(parseServiceCallTypes(['MAINTENANCE', 'DROP TABLE', '']), ['MAINTENANCE']);
  assert.deepEqual(parseServiceCallTypes([]), []);
});

test('the same box ticked twice is one tick', () => {
  assert.deepEqual(parseServiceCallTypes(['VALIDATION', 'VALIDATION']), ['VALIDATION']);
});

test('an address skips the lines that are missing', () => {
  assert.equal(
    joinAddress(['308-A, Gupta Building', null, 'Ambernath', undefined, '421501']),
    '308-A, Gupta Building, Ambernath, 421501',
  );
  assert.equal(joinAddress([null, undefined, '  ']), '');
});

test('every tick box on the sheet has a label and an order', () => {
  // A box that renders with no label is a box nobody can tick correctly.
  for (const [order, labels] of [
    [SERVICE_CALL_TYPE_ORDER, SERVICE_CALL_TYPE_LABELS],
    [SERVICE_CONTRACT_TYPE_ORDER, SERVICE_CONTRACT_TYPE_LABELS],
    [SERVICE_OUTCOME_ORDER, SERVICE_OUTCOME_LABELS],
  ] as Array<[string[], Record<string, string>]>) {
    assert.equal(order.length, Object.keys(labels).length);
    for (const value of order) {
      assert.ok(labels[value], `${value} has no printed label`);
    }
  }
});

test('the labels match the wording on the paper form', () => {
  assert.equal(SERVICE_CALL_TYPE_LABELS.NEW_INSTALLATION, 'New Installation');
  assert.equal(SERVICE_CONTRACT_TYPE_LABELS.UNDER_AMC, 'Under AMC');
  assert.equal(SERVICE_OUTCOME_LABELS.NOT_OK, 'Not OK');
});
