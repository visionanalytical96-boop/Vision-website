import 'server-only';
import { parseCsv, type ParsedTable } from '@/lib/import/parse-csv';

/**
 * Reads an uploaded CSV or Excel file into a table.
 *
 * exceljs is loaded on demand: it is a large dependency used on one admin
 * screen, and a top-level import would pull it into the build analysis of every
 * route that never touches an import.
 */

export type ImportFileType = 'csv' | 'xlsx';

/** Rows above this are refused rather than half-imported. See MAX_ROWS. */
export const MAX_ROWS = 5000;

export function detectFileType(fileName: string): ImportFileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) return 'xlsx';
  return null;
}

/**
 * Turns one Excel cell into the string the rest of the pipeline expects.
 *
 * Excel hands back rich objects — a formula cell carries its result, a
 * hyperlink its text, a date a real Date. Calling String() on those yields
 * "[object Object]", which then fails validation with a message that tells the
 * user nothing about what is wrong.
 */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const cell = value as Record<string, unknown>;
    if ('text' in cell) return String(cell.text ?? '');
    if ('result' in cell) return String(cell.result ?? '');
    if ('richText' in cell && Array.isArray(cell.richText)) {
      return cell.richText.map((part) => String((part as { text?: string }).text ?? '')).join('');
    }
    if ('hyperlink' in cell) return String(cell.hyperlink ?? '');
    return '';
  }
  return String(value);
}

async function readXlsx(buffer: Buffer): Promise<ParsedTable> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  // The first worksheet, not one named "Sheet1": a template that has been
  // renamed is still the file the user means.
  const sheet = workbook.worksheets[0];
  if (!sheet) return { header: [], rows: [], rowNumbers: [] };

  const records: string[][] = [];
  const lineNumbers: number[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    // `values` is 1-indexed with a hole at 0.
    const cells = (row.values as unknown[]).slice(1).map(cellToString);
    records.push(cells);
    lineNumbers.push(rowNumber);
  });

  if (records.length === 0) return { header: [], rows: [], rowNumbers: [] };
  return { header: records[0], rows: records.slice(1), rowNumbers: lineNumbers.slice(1) };
}

export interface ReadResult {
  table: ParsedTable;
  fileType: ImportFileType;
  error?: string;
}

export async function readImportFile(file: File): Promise<ReadResult> {
  const fileType = detectFileType(file.name);
  if (!fileType) {
    return {
      table: { header: [], rows: [], rowNumbers: [] },
      fileType: 'csv',
      error: 'Upload a .csv or .xlsx file.',
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let table: ParsedTable;
  try {
    table = fileType === 'csv' ? parseCsv(buffer.toString('utf8')) : await readXlsx(buffer);
  } catch (error: unknown) {
    return {
      table: { header: [], rows: [], rowNumbers: [] },
      fileType,
      error: `Could not read the file: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }

  if (table.header.length === 0) {
    return { table, fileType, error: 'The file has no header row.' };
  }
  if (table.rows.length > MAX_ROWS) {
    // The whole import commits in one transaction, and a transaction that runs
    // for minutes blocks other writes. Splitting the file is the honest fix.
    return {
      table,
      fileType,
      error: `That file has ${table.rows.length} rows; the limit is ${MAX_ROWS}. Split it and import in parts.`,
    };
  }

  return { table, fileType };
}
