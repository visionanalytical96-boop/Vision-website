import { normaliseHeader, type ParsedTable } from '@/lib/import/parse-csv';

/**
 * One column in an import template.
 *
 * `aliases` matter more than they look: the file usually arrives from someone
 * else's system, and rejecting it because a header says "Part No" instead of
 * "SKU" turns a five-minute import into a morning of retyping.
 */
export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  description: string;
  example: string;
  aliases?: string[];
}

export interface MappedTable {
  /** One object per data row, keyed by column key. Missing columns are ''. */
  rows: Array<Record<string, string>>;
  rowNumbers: number[];
  /** Template columns the file did not provide. */
  missingRequired: string[];
  /** Headers in the file that matched no column — kept to warn, not to fail. */
  unknownHeaders: string[];
}

/**
 * Maps a parsed file onto a template's columns.
 *
 * Unknown headers are reported, never fatal: an export that carries extra
 * columns is normal, and refusing it would help nobody.
 */
export function mapColumns(table: ParsedTable, columns: ImportColumn[]): MappedTable {
  const byNormalised = new Map<string, ImportColumn>();
  for (const column of columns) {
    byNormalised.set(normaliseHeader(column.key), column);
    byNormalised.set(normaliseHeader(column.label), column);
    for (const alias of column.aliases ?? []) byNormalised.set(normaliseHeader(alias), column);
  }

  const columnAt: Array<ImportColumn | null> = [];
  const unknownHeaders: string[] = [];
  const matched = new Set<string>();

  for (const header of table.header) {
    const column = byNormalised.get(normaliseHeader(header)) ?? null;
    columnAt.push(column);
    if (column) matched.add(column.key);
    else if (header.trim() !== '') unknownHeaders.push(header);
  }

  const rows = table.rows.map((cells) => {
    const row: Record<string, string> = {};
    for (const column of columns) row[column.key] = '';
    for (const [index, column] of columnAt.entries()) {
      if (column) row[column.key] = cells[index] ?? '';
    }
    return row;
  });

  return {
    rows,
    rowNumbers: table.rowNumbers,
    missingRequired: columns.filter((c) => c.required && !matched.has(c.key)).map((c) => c.label),
    unknownHeaders,
  };
}

/** Drops rows where every mapped cell is blank — trailing rows in a spreadsheet. */
export function dropBlankRows(mapped: MappedTable): MappedTable {
  const keep = mapped.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => Object.values(row).some((value) => value.trim() !== ''));

  return {
    ...mapped,
    rows: keep.map((k) => k.row),
    rowNumbers: keep.map((k) => mapped.rowNumbers[k.index]),
  };
}

// --- Cell coercion ------------------------------------------------------------
// Spreadsheets are loose about types; the database is not. These turn what a
// human typed into what the column needs, and say nothing when they cannot.

/** "yes", "true", "1", "y" → true. Blank → the supplied default. */
export function toBoolean(value: string, fallback = false): boolean {
  const text = value.trim().toLowerCase();
  if (text === '') return fallback;
  return ['yes', 'true', '1', 'y', 'published', 'active'].includes(text);
}

/** Digits only, so "₹ 1,25,000" and "125000.00" both read as 125000. */
export function toNumber(value: string): number | null {
  const text = value.replace(/[^\d.-]/g, '').trim();
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A rupee amount to paise.
 *
 * Rounded rather than truncated, and via a string to sidestep the float error
 * that turns 1234.35 into 123434 paise.
 */
export function toMinorAmount(value: string): number | null {
  const rupees = toNumber(value);
  if (rupees === null) return null;
  return Math.round(rupees * 100);
}

/**
 * A date, accepting the formats people actually type.
 *
 * dd/mm/yyyy is read as day-first: this is an Indian business, where 03/04/2026
 * means 3 April. Guessing month-first would silently shift dates by months.
 */
export function toDate(value: string): Date | null {
  const text = value.trim();
  if (text === '') return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));

  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** A comma or pipe separated list, trimmed and de-duplicated. */
export function toList(value: string): string[] {
  return [...new Set(value.split(/[,|]/).map((item) => item.trim()).filter(Boolean))];
}
