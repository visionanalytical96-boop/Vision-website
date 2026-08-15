/**
 * Turning a before/after pair into the "what changed" half of an audit entry.
 *
 * Pure and separate from `audit.ts`, which is `server-only` because it writes
 * to the database. This half is where the subtle bugs live - an unchanged
 * field that looks changed because a Date stringified differently - so it is
 * kept testable on its own.
 */

export interface FieldChange {
  from: string;
  to: string;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return String(value);
}

/**
 * Only the fields that actually differ, rendered as strings.
 *
 * Strings rather than raw values because this is read by a person in a table,
 * and because a Date or a Decimal that round-trips through JSON comes back a
 * different shape than it went in.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  labels: Partial<Record<keyof T & string, string>> = {},
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};

  for (const [key, next] of Object.entries(after)) {
    const previous = before[key];
    const from = displayValue(previous);
    const to = displayValue(next);
    if (from !== to) {
      changes[labels[key as keyof T & string] ?? key] = { from, to };
    }
  }

  return changes;
}
