import 'server-only';

/**
 * Photo intake without a native image library.
 *
 * Cloudflare's runtime cannot load sharp, so resizing and WebP encoding happen
 * in the browser (see src/lib/resize-image.ts) and this side becomes the guard:
 * it will not take the browser's word for what the bytes are.
 *
 * Every upload is checked against the real file signature and its dimensions
 * are read out of the container header. Anything that is not a JPEG, PNG or
 * WebP is refused, so an HTML or SVG payload cannot be stored behind an
 * image content type. The serving route additionally sends `nosniff`.
 */

/** Generous, but far below what an un-resized phone photo would be. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_DIMENSION = 1600;
/** Nothing sane is this large; a header claiming otherwise is malformed. */
const MAX_HEADER_DIMENSION = 20_000;

export type PreparedPhoto = {
  /** Prisma's `Bytes` column wants a Uint8Array backed by a plain ArrayBuffer. */
  data: Uint8Array<ArrayBuffer>;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
};

type Probe = { mimeType: string; width: number; height: number };

/** Byte at `i`, or 0 past the end — a truncated header then fails its checks. */
const u8 = (b: Uint8Array, i: number): number => b[i] ?? 0;
const tag = (b: Uint8Array, o: number) =>
  String.fromCharCode(u8(b, o), u8(b, o + 1), u8(b, o + 2), u8(b, o + 3));

/** JPEG: walk the segment markers to the SOF frame that carries the size. */
function probeJpeg(b: Uint8Array): Probe | null {
  if (u8(b, 0) !== 0xff || u8(b, 1) !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (u8(b, i) !== 0xff) return null;
    const marker = u8(b, i + 1);
    const length = (u8(b, i + 2) << 8) | u8(b, i + 3);
    if (length < 2) return null;
    // SOF0..SOF15, skipping the four that are not frame headers.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc, 0xd8].includes(marker)) {
      const height = (u8(b, i + 5) << 8) | u8(b, i + 6);
      const width = (u8(b, i + 7) << 8) | u8(b, i + 8);
      return { mimeType: 'image/jpeg', width, height };
    }
    i += 2 + length;
  }
  return null;
}

/** PNG: the IHDR chunk is always first and always at a fixed offset. */
function probePng(b: Uint8Array): Probe | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || sig.some((v, i) => u8(b, i) !== v)) return null;
  if (tag(b, 12) !== 'IHDR') return null;
  const u32 = (o: number) =>
    (u8(b, o) << 24) | (u8(b, o + 1) << 16) | (u8(b, o + 2) << 8) | u8(b, o + 3);
  return { mimeType: 'image/png', width: u32(16) >>> 0, height: u32(20) >>> 0 };
}

/** WebP: RIFF container, then one of three chunk layouts that store the size. */
function probeWebp(b: Uint8Array): Probe | null {
  if (b.length < 30 || tag(b, 0) !== 'RIFF' || tag(b, 8) !== 'WEBP') return null;
  const kind = tag(b, 12);

  if (kind === 'VP8 ') {
    // Lossy: 14-bit dimensions after the 3-byte start code.
    const width = ((u8(b, 27) << 8) | u8(b, 26)) & 0x3fff;
    const height = ((u8(b, 29) << 8) | u8(b, 28)) & 0x3fff;
    return { mimeType: 'image/webp', width, height };
  }
  if (kind === 'VP8L') {
    // Lossless: 14 bits each, packed across four bytes after the signature.
    const bits = u8(b, 21) | (u8(b, 22) << 8) | (u8(b, 23) << 16) | (u8(b, 24) << 24);
    return { mimeType: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') {
    // Extended: 24-bit minus-one dimensions.
    const width = (u8(b, 24) | (u8(b, 25) << 8) | (u8(b, 26) << 16)) + 1;
    const height = (u8(b, 27) | (u8(b, 28) << 8) | (u8(b, 29) << 16)) + 1;
    return { mimeType: 'image/webp', width, height };
  }
  return null;
}

/** The declared MIME type is ignored — only the bytes decide. */
function probe(bytes: Uint8Array): Probe | null {
  return probeJpeg(bytes) ?? probePng(bytes) ?? probeWebp(bytes);
}

export async function preparePhoto(file: File): Promise<PreparedPhoto | { error: string }> {
  if (file.size === 0) return { error: 'Photo khaali hai' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Photo 4 MB se choti honi chahiye' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const found = probe(bytes);
  if (!found) return { error: 'Sirf JPG, PNG ya WebP photo chalegi' };

  const { width, height, mimeType } = found;
  if (!width || !height || width > MAX_HEADER_DIMENSION || height > MAX_HEADER_DIMENSION) {
    return { error: 'Photo padhi nahi ja saki' };
  }

  return { data: bytes, mimeType, width, height, bytes: bytes.byteLength };
}
