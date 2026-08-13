/**
 * A CSV reader that survives real spreadsheet exports.
 *
 * Deliberately a character state machine rather than split-by-newline: a quoted
 * field may legitimately contain a newline, and a line-based split turns one
 * address spanning two lines into two broken rows. That failure is silent —
 * the import succeeds and the data is wrong — which is the worst kind.
 */

export interface ParsedTable {
  header: string[];
  /** Data rows, each aligned to `header` by position. */
  rows: string[][];
  /** Source line number of each row, for error messages that can be acted on. */
  rowNumbers: number[];
}

/** Detects the delimiter from the header line: comma, semicolon or tab. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  const counts = [
    [',', (firstLine.match(/,/g) ?? []).length],
    [';', (firstLine.match(/;/g) ?? []).length],
    ['\t', (firstLine.match(/\t/g) ?? []).length],
  ] as const;

  // Excel in a European locale exports semicolons; a tab export is common too.
  return counts.reduce((best, current) => (current[1] > best[1] ? current : best))[0] || ',';
}

export function parseCsv(input: string): ParsedTable {
  // Strip the UTF-8 BOM Excel writes, or the first header becomes "﻿SKU"
  // and matches nothing.
  const text = input.replace(/^﻿/, '');
  const delimiter = detectDelimiter(text);

  const records: string[][] = [];
  const lineNumbers: number[] = [];

  let field = '';
  let record: string[] = [];
  let quoted = false;
  let line = 1;
  let recordStartLine = 1;
  let sawAnyChar = false;

  const endField = () => {
    record.push(field.trim());
    field = '';
  };
  const endRecord = () => {
    endField();
    // A trailing newline produces one empty field; that is not a row.
    if (!(record.length === 1 && record[0] === '')) {
      records.push(record);
      lineNumbers.push(recordStartLine);
    }
    record = [];
    recordStartLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    sawAnyChar = true;

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field.trim() === '') {
      // Only opens a quoted field at the start of one; a stray quote mid-field
      // is data, not syntax.
      quoted = true;
      field = '';
    } else if (char === delimiter) {
      endField();
    } else if (char === '\r') {
      // Swallow; the \n that follows ends the record.
    } else if (char === '\n') {
      endRecord();
      line += 1;
    } else {
      field += char;
    }
  }

  if (sawAnyChar && (field !== '' || record.length > 0)) endRecord();

  if (records.length === 0) return { header: [], rows: [], rowNumbers: [] };

  return {
    header: records[0],
    rows: records.slice(1),
    rowNumbers: lineNumbers.slice(1),
  };
}

/**
 * Normalises a header for matching: "Employee Code", "employee_code" and
 * "EMPLOYEECODE" all become "employeecode". People retype these by hand and
 * an import that rejects a file over a capital letter is an import nobody uses.
 */
export function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
