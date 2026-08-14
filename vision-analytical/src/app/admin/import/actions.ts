'use server';

import { requireUser } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import { readImportFile } from '@/lib/import/read-file';
import { mapColumns, dropBlankRows } from '@/lib/import/columns';
import { getImportDefinition } from '@/lib/import/definitions';
import { prisma } from '@/lib/db';

// Types re-exported so the client component can import them from one place.
export type { ImportColumnInfo, ImportDefinitionInfo } from '@/lib/import/registry';

export interface PreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  status: 'create' | 'update' | 'error';
  errors: string[];
  key: string;
}

export interface PreviewResult {
  ok: boolean;
  error?: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createRows: number;
  updateRows: number;
  missingRequired: string[];
  unknownHeaders: string[];
  rows: PreviewRow[];
}

/**
 * Upload + validate: the file never touches disk, the preview never touches
 * the database (except for loadContext and findExisting, which are reads).
 */
export async function previewImport(formData: FormData): Promise<PreviewResult> {
  await requireUser(Role.ADMIN);

  const definitionKey = formData.get('definition') as string | null;
  const file = formData.get('file') as File | null;

  if (!definitionKey || !file) {
    return emptyPreview('Select a data type and upload a file.');
  }

  const definition = getImportDefinition(definitionKey);
  if (!definition) {
    return emptyPreview(`Unknown import type "${definitionKey}".`);
  }

  const { table, error: readError } = await readImportFile(file);
  if (readError) {
    return emptyPreview(readError);
  }

  const mapped = dropBlankRows(mapColumns(table, definition.columns));
  if (mapped.rows.length === 0) {
    return emptyPreview('The file has no data rows after the header.');
  }

  // Load context once, then validate every row against it.
  const context = await definition.loadContext(mapped.rows);

  const validated = mapped.rows.map((row, index) => ({
    rowNumber: mapped.rowNumbers[index],
    raw: row,
    result: definition.validateRow(row, context),
  }));

  // Find existing records for the valid rows.
  const validKeys = validated
    .filter((v) => v.result.ok)
    .map((v) => (v.result as { ok: true; key: string }).key);

  const existing = validKeys.length > 0
    ? await definition.findExisting(validKeys)
    : new Map<string, string>();

  const rows: PreviewRow[] = validated.map((v) => {
    if (!v.result.ok) {
      return {
        rowNumber: v.rowNumber,
        values: v.raw,
        status: 'error' as const,
        errors: v.result.errors,
        key: '',
      };
    }
    const key = v.result.key;
    const existingId = existing.get(key);
    return {
      rowNumber: v.rowNumber,
      values: v.raw,
      status: existingId ? 'update' as const : 'create' as const,
      errors: [],
      key,
    };
  });

  const errorRows = rows.filter((r) => r.status === 'error').length;
  const createRows = rows.filter((r) => r.status === 'create').length;
  const updateRows = rows.filter((r) => r.status === 'update').length;

  return {
    ok: true,
    totalRows: rows.length,
    validRows: createRows + updateRows,
    errorRows,
    createRows,
    updateRows,
    missingRequired: mapped.missingRequired,
    unknownHeaders: mapped.unknownHeaders,
    rows,
  };
}

function emptyPreview(error: string): PreviewResult {
  return {
    ok: false,
    error,
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    createRows: 0,
    updateRows: 0,
    missingRequired: [],
    unknownHeaders: [],
    rows: [],
  };
}

// --- Commit ------------------------------------------------------------------

export interface CommitResult {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
  skipped: number;
}

/**
 * Runs the actual import: re-reads the file, re-validates (the preview is not
 * trusted — the user may have changed the file), and commits in a single
 * transaction so either everything lands or nothing does.
 */
export async function commitImport(formData: FormData): Promise<CommitResult> {
  await requireUser(Role.ADMIN);

  const definitionKey = formData.get('definition') as string | null;
  const file = formData.get('file') as File | null;

  if (!definitionKey || !file) {
    return { ok: false, error: 'Missing data.', created: 0, updated: 0, skipped: 0 };
  }

  const definition = getImportDefinition(definitionKey);
  if (!definition) {
    return { ok: false, error: `Unknown import type "${definitionKey}".`, created: 0, updated: 0, skipped: 0 };
  }

  const { table, error: readError } = await readImportFile(file);
  if (readError) {
    return { ok: false, error: readError, created: 0, updated: 0, skipped: 0 };
  }

  const mapped = dropBlankRows(mapColumns(table, definition.columns));
  if (mapped.rows.length === 0) {
    return { ok: false, error: 'No data rows.', created: 0, updated: 0, skipped: 0 };
  }

  const context = await definition.loadContext(mapped.rows);

  const validated = mapped.rows.map((row) => definition.validateRow(row, context));

  // Only commit valid rows — errors are skipped, not aborted.
  const valid = validated.filter((v) => v.ok) as Array<{ ok: true; key: string; value: unknown }>;
  const skipped = validated.filter((v) => !v.ok).length;

  if (valid.length === 0) {
    return { ok: false, error: 'Every row has errors. Fix the file and try again.', created: 0, updated: 0, skipped };
  }

  const existingKeys = valid.map((v) => v.key);
  const existing = await definition.findExisting(existingKeys);

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of valid) {
      const existingId = existing.get(row.key);
      if (existingId) {
        await definition.update(tx, existingId, row.value);
        updated += 1;
      } else {
        await definition.create(tx, row.value);
        created += 1;
      }
    }
  });

  return { ok: true, created, updated, skipped };
}
