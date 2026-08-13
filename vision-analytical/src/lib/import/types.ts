import type { Prisma } from '@/generated/prisma/client';
import type { ImportColumn } from '@/lib/import/columns';

export type ImportTx = Prisma.TransactionClient;

export type RowResult<TValue> =
  | { ok: true; value: TValue; key: string }
  | { ok: false; errors: string[] };

/**
 * One importable entity.
 *
 * The two-phase shape — `loadContext` once, then `validateRow` per row against
 * what it loaded — is what keeps a 500-row file from issuing 500 lookups for
 * the same brand. Validation touches no database.
 */
export interface ImportDefinition<TValue, TContext> {
  key: string;
  label: string;
  description: string;
  columns: ImportColumn[];
  /** How duplicates are recognised, in words, for the preview screen. */
  duplicateBy: string;
  /** Loads every reference row the file could need, in one pass. */
  loadContext(rows: Array<Record<string, string>>): Promise<TContext>;
  /** Pure given the context: no I/O, so it is testable and fast. */
  validateRow(row: Record<string, string>, context: TContext): RowResult<TValue>;
  /** Existing records by natural key, so the preview can say create vs update. */
  findExisting(keys: string[]): Promise<Map<string, string>>;
  create(tx: ImportTx, value: TValue): Promise<string>;
  update(tx: ImportTx, id: string, value: TValue): Promise<void>;
}

/**
 * Type-erased view for the registry.
 *
 * The registry holds nine definitions with nine different value types; erasing
 * at this boundary keeps each definition internally type-safe while letting the
 * pipeline treat them uniformly.
 */
export interface AnyImportDefinition {
  key: string;
  label: string;
  description: string;
  columns: ImportColumn[];
  duplicateBy: string;
  loadContext(rows: Array<Record<string, string>>): Promise<unknown>;
  validateRow(row: Record<string, string>, context: unknown): RowResult<unknown>;
  findExisting(keys: string[]): Promise<Map<string, string>>;
  create(tx: ImportTx, value: unknown): Promise<string>;
  update(tx: ImportTx, id: string, value: unknown): Promise<void>;
}

/**
 * Erases the value and context types without an `any` in sight.
 *
 * The casts are confined to this one function: the pipeline only ever passes a
 * context back to the definition that produced it, and a value back to the
 * definition that validated it, so the erased types cannot be mismatched.
 */
export function defineImport<TValue, TContext>(
  definition: ImportDefinition<TValue, TContext>,
): AnyImportDefinition {
  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    columns: definition.columns,
    duplicateBy: definition.duplicateBy,
    loadContext: (rows) => definition.loadContext(rows),
    validateRow: (row, context) => definition.validateRow(row, context as TContext),
    findExisting: (keys) => definition.findExisting(keys),
    create: (tx, value) => definition.create(tx, value as TValue),
    update: (tx, id, value) => definition.update(tx, id, value as TValue),
  };
}
