import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every field on the printed Vision Analytical service report, checked against
 * the code that renders it.
 *
 * The paper form is the contract — a customer signs it, and a box that quietly
 * stops printing is not something a type error would ever catch. These tests
 * read the sheet component and the form and assert each field is still there,
 * so dropping one fails the build instead of appearing on a signed report.
 */

const root = path.join(import.meta.dirname, '..');
const sheet = readFileSync(path.join(root, 'src/components/service-report/ServiceReportSheet.tsx'), 'utf8');
const form = readFileSync(path.join(root, 'src/components/forms/ServiceReportGenerator.tsx'), 'utf8');
const actions = readFileSync(path.join(root, 'src/lib/actions/service-reports.ts'), 'utf8');
const schema = readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');

/** Heading text as printed on the sheet. */
const PRINTED_HEADINGS = [
  'Service Report',
  'Company Name &amp; Address:',
  'Date:',
  'Tele No.:',
  'Contact Person:',
  'Week Off:',
  'Designation &amp; Dept.:',
  'Status:',
  'Fault Reported',
  'Observation &amp; Action Taken',
  'Parts Replaced / Required',
  'Clients Comments',
];

/** The visit table columns, in the order the form is ruled. */
const VISIT_COLUMNS = [
  'Date',
  'Time IN',
  'Time OUT',
  'System Configuration',
  'Model Description',
  'System No.',
];

/** Fields carried from the form through to the database. */
const DATA_FIELDS = [
  'reportDate',
  'companyName',
  'companyAddress',
  'telephone',
  'contactPerson',
  'contactDesignation',
  'contactDepartment',
  'weekOff',
  'outcome',
  'serviceTypes',
  'contractType',
  'faultReported',
  'workPerformed',
  'partsSummary',
  'customerRemarks',
  'customerName',
  'customerDesignation',
  'signedAt',
  'engineerName',
];

const VISIT_FIELDS = [
  'visitedOn',
  'timeIn',
  'timeOut',
  'systemConfiguration',
  'modelDescription',
  'systemNumber',
];

test('every heading on the paper form is printed', () => {
  for (const heading of PRINTED_HEADINGS) {
    assert.ok(sheet.includes(heading), `the sheet no longer prints "${heading}"`);
  }
});

test('the visit table keeps all six columns', () => {
  for (const column of VISIT_COLUMNS) {
    assert.ok(sheet.includes(column), `visit table lost the "${column}" column`);
  }
});

test('every field reaches the printed sheet', () => {
  for (const field of DATA_FIELDS) {
    assert.ok(sheet.includes(field), `"${field}" is captured but never printed`);
  }
});

test('every field is on the form the engineer fills in', () => {
  for (const field of DATA_FIELDS) {
    assert.ok(form.includes(field), `"${field}" prints but has no input on the form`);
  }
});

test('every field survives the round trip to the database', () => {
  for (const field of DATA_FIELDS) {
    assert.ok(actions.includes(field), `"${field}" is on the form but the action drops it`);
    assert.ok(schema.includes(field), `"${field}" has no column to be stored in`);
  }
});

test('a visit row keeps all six values end to end', () => {
  for (const field of VISIT_FIELDS) {
    assert.ok(sheet.includes(field), `visit row value "${field}" is not printed`);
    assert.ok(form.includes(field), `visit row value "${field}" has no input`);
    assert.ok(schema.includes(field), `visit row value "${field}" has no column`);
  }
});

test('the tick-box groups all render', () => {
  // Status, type of visit and who pays — three separate groups on the sheet.
  for (const group of [
    'SERVICE_OUTCOME_ORDER',
    'SERVICE_CALL_TYPE_ORDER',
    'SERVICE_CONTRACT_TYPE_ORDER',
  ]) {
    assert.ok(sheet.includes(group), `the sheet stopped rendering ${group}`);
    assert.ok(form.includes(group), `the form stopped offering ${group}`);
  }
});

test('both signature blocks are on the sheet', () => {
  assert.ok(sheet.includes('Customer&rsquo;s Name, Signature, Date &amp; Stamp'));
  assert.ok(sheet.includes('Service Engineer&rsquo;s Name &amp; Signature'));
});

test('the letterhead is driven by settings, not hardcoded', () => {
  // The address changing in the admin has to change what prints.
  assert.ok(sheet.includes('letterhead.companyName'));
  assert.ok(sheet.includes('letterhead.addressLines'));
  assert.ok(sheet.includes('letterhead.email'));
  assert.ok(sheet.includes('letterhead.phone'));
  assert.ok(!sheet.includes('9136216080'), 'a phone number is hardcoded into the sheet');
});

test('the report number is stored and printed', () => {
  assert.ok(schema.includes('reportNumber'));
  assert.ok(actions.includes('buildReportNumber'));
  assert.ok(sheet.includes('reportNumber'));
});
