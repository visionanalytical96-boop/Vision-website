/**
 * CSV generation for report downloads.
 *
 * Opens directly in Excel, LibreOffice and Google Sheets, needs no library and
 * no paid component. Where a report genuinely needs formatting, an .xlsx
 * writer can be added later behind the same route.
 */

export type CsvCell = string | number | boolean | Date | null | undefined;

/**
 * Escapes one cell.
 *
 * The leading-quote on formula characters is not cosmetic: a spreadsheet reads
 * a cell starting with =, +, - or @ as a formula, and these exports carry names
 * and free-text notes that anyone with admin access can set. Prefixing makes
 * the cell display as typed instead of executing when the file is opened.
 */
function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';

  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'boolean') text = value ? 'Yes' : 'No';
  else text = String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))];
  return lines.join('\r\n');
}

/**
 * A downloadable CSV response.
 *
 * The BOM is what makes Excel on Windows read the file as UTF-8; without it,
 * a rupee sign or a name with a diacritic arrives as mojibake.
 */
export function csvResponse(filename: string, csv: string): Response {
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '-');
  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
