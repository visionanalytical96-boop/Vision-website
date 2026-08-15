import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normaliseHeader } from '@/lib/import/parse-csv';
import { mapColumns, dropBlankRows, toBoolean, toNumber, toMinorAmount, toDate, toList } from '@/lib/import/columns';
import type { ImportColumn } from '@/lib/import/columns';

const columns: ImportColumn[] = [
  { key: 'sku', label: 'SKU', required: true, description: '', example: '', aliases: ['part no'] },
  { key: 'name', label: 'Name', required: true, description: '', example: '' },
  { key: 'price', label: 'Price (₹)', required: false, description: '', example: '' },
];

test('reads a plain file', () => {
  const table = parseCsv('SKU,Name\nVA-1,Pump\nVA-2,Detector\n');
  assert.deepEqual(table.header, ['SKU', 'Name']);
  assert.deepEqual(table.rows, [['VA-1', 'Pump'], ['VA-2', 'Detector']]);
  // Line numbers are the source lines, so an error can be found in the file.
  assert.deepEqual(table.rowNumbers, [2, 3]);
});

test('a quoted field may contain the delimiter', () => {
  const table = parseCsv('SKU,Name\nVA-1,"Pump, high pressure"\n');
  assert.deepEqual(table.rows[0], ['VA-1', 'Pump, high pressure']);
});

test('a quoted field may contain a newline', () => {
  // The case a split-by-line reader gets wrong: it would produce two broken
  // rows and the import would succeed with corrupted data.
  const table = parseCsv('SKU,Address\nVA-1,"Plot 12\nMIDC Phase II"\nVA-2,Elsewhere\n');
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0][1], 'Plot 12\nMIDC Phase II');
  assert.equal(table.rows[1][0], 'VA-2');
});

test('a doubled quote is one literal quote', () => {
  const table = parseCsv('SKU,Name\nVA-1,"6"" column"\n');
  assert.equal(table.rows[0][1], '6" column');
});

test('the UTF-8 BOM Excel writes does not corrupt the first header', () => {
  const table = parseCsv('﻿SKU,Name\nVA-1,Pump\n');
  assert.equal(table.header[0], 'SKU');
});

test('semicolon and tab separated files are detected', () => {
  assert.deepEqual(parseCsv('SKU;Name\nVA-1;Pump\n').rows[0], ['VA-1', 'Pump']);
  assert.deepEqual(parseCsv('SKU\tName\nVA-1\tPump\n').rows[0], ['VA-1', 'Pump']);
});

test('CRLF line endings are handled', () => {
  const table = parseCsv('SKU,Name\r\nVA-1,Pump\r\n');
  assert.deepEqual(table.rows, [['VA-1', 'Pump']]);
});

test('a trailing newline does not become an empty row', () => {
  assert.equal(parseCsv('SKU,Name\nVA-1,Pump\n\n').rows.length, 1);
});

test('headers match regardless of case, spacing and punctuation', () => {
  assert.equal(normaliseHeader('Employee Code'), 'employeecode');
  assert.equal(normaliseHeader('employee_code'), 'employeecode');
  assert.equal(normaliseHeader('EMPLOYEE-CODE'), 'employeecode');
});

test('columns map by label, key or alias', () => {
  const mapped = mapColumns(parseCsv('Part No,name,Price (₹)\nVA-1,Pump,1200\n'), columns);
  assert.deepEqual(mapped.rows[0], { sku: 'VA-1', name: 'Pump', price: '1200' });
  assert.deepEqual(mapped.missingRequired, []);
});

test('a missing required column is reported by its label', () => {
  const mapped = mapColumns(parseCsv('Name\nPump\n'), columns);
  assert.deepEqual(mapped.missingRequired, ['SKU']);
});

test('unknown columns are reported but never fatal', () => {
  // An export carrying extra columns is normal; refusing it helps nobody.
  const mapped = mapColumns(parseCsv('SKU,Name,Warehouse Bin\nVA-1,Pump,A4\n'), columns);
  assert.deepEqual(mapped.unknownHeaders, ['Warehouse Bin']);
  assert.deepEqual(mapped.missingRequired, []);
});

test('columns absent from the file read as empty, not undefined', () => {
  const mapped = mapColumns(parseCsv('SKU,Name\nVA-1,Pump\n'), columns);
  assert.equal(mapped.rows[0].price, '');
});

test('blank trailing rows are dropped, and line numbers stay aligned', () => {
  const mapped = dropBlankRows(mapColumns(parseCsv('SKU,Name\nVA-1,Pump\n,\nVA-2,Valve\n'), columns));
  assert.equal(mapped.rows.length, 2);
  assert.equal(mapped.rows[1].sku, 'VA-2');
  assert.equal(mapped.rowNumbers[1], 4, 'the second kept row came from line 4');
});

test('booleans accept what people actually type', () => {
  for (const yes of ['yes', 'Yes', 'TRUE', '1', 'y', 'active']) assert.equal(toBoolean(yes), true, yes);
  for (const no of ['no', 'false', '0', 'n']) assert.equal(toBoolean(no), false, no);
  assert.equal(toBoolean('', true), true, 'blank falls back to the default');
});

test('numbers survive currency symbols and Indian digit grouping', () => {
  assert.equal(toNumber('₹ 1,25,000'), 125000);
  assert.equal(toNumber('125000.50'), 125000.5);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber('not a number'), null);
});

test('rupees convert to paise without float error', () => {
  assert.equal(toMinorAmount('1234.35'), 123435);
  assert.equal(toMinorAmount('₹1,25,000'), 12500000);
  assert.equal(toMinorAmount(''), null);
});

test('dates are read day-first, as an Indian business writes them', () => {
  // 03/04/2026 is 3 April, not 4 March. Guessing month-first would shift
  // dates by months and nothing would look obviously wrong.
  assert.equal(toDate('03/04/2026')?.toISOString().slice(0, 10), '2026-04-03');
  assert.equal(toDate('2026-04-03')?.toISOString().slice(0, 10), '2026-04-03');
  assert.equal(toDate(''), null);
});

test('lists split on commas or pipes and de-duplicate', () => {
  assert.deepEqual(toList('HPLC, GC-MS , HPLC'), ['HPLC', 'GC-MS']);
  assert.deepEqual(toList('a|b'), ['a', 'b']);
  assert.deepEqual(toList(''), []);
});
