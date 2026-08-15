/**
 * Turns a label into a URL-safe slug.
 *
 * Used to key things people type freely — tags, topics — so "HPLC", "hplc" and
 * "HPLC " all resolve to one row rather than three that mean the same thing.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    // Strip combining marks so "Sørensen" slugs as "sorensen" rather than losing the letter.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
