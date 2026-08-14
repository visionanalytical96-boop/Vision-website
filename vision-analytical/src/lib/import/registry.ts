/**
 * Client-safe import metadata.
 *
 * The definitions themselves are server-only (they touch Prisma), but the
 * metadata the wizard needs — key, label, columns, examples — is pure data.
 * This module re-exports only that shape, so a client component can import it
 * without pulling in `server-only`.
 */

export interface ImportColumnInfo {
  key: string;
  label: string;
  required: boolean;
  description: string;
  example: string;
}

export interface ImportDefinitionInfo {
  key: string;
  label: string;
  description: string;
  duplicateBy: string;
  columns: ImportColumnInfo[];
}
