// Product/RefurbishedInstrument.images is a Json column (not a native array),
// so Prisma types it as JsonValue - narrow it the same way other Json
// columns in this codebase are narrowed (see isAddressLike, isPartsUsedList).
export function toImageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
