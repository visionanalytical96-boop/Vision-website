/**
 * The text fields of a submitted form, to be echoed back in the action's
 * result.
 *
 * React resets an uncontrolled form once its action completes — including when
 * the action comes back with validation errors. Without echoing the values
 * back as defaults, a single bad field discards everything the user typed,
 * which on the article editor means losing an entire article body.
 *
 * Files are skipped: a File cannot be re-populated into an <input type="file">
 * for security reasons, so there is nothing useful to send back.
 */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

/** Reads an echoed value, falling back to the stored entity's value. */
export function submittedOr(
  values: Record<string, string> | undefined,
  key: string,
  fallback: string | number | null | undefined,
): string {
  const submitted = values?.[key];
  if (submitted !== undefined) return submitted;
  return fallback === null || fallback === undefined ? '' : String(fallback);
}

/**
 * Same idea for checkboxes. An unchecked box sends nothing, so the presence of
 * the key is the answer — but only once the form has actually been submitted,
 * which `values` being defined tells us.
 */
export function submittedChecked(
  values: Record<string, string> | undefined,
  key: string,
  fallback: boolean,
): boolean {
  if (!values) return fallback;
  return values[key] === 'true';
}
