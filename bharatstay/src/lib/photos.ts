import 'server-only';
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB before resizing
export const MAX_DIMENSION = 1600;
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']);

export type PreparedPhoto = {
  data: Buffer;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Decodes an uploaded file, strips metadata and re-encodes it as a reasonably
 * sized WebP. Re-encoding matters as much as the size cap: it means whatever a
 * partner uploads is stored as image bytes we produced, not as an opaque blob
 * we hand back to browsers untouched.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto | { error: string }> {
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Photo 12 MB se choti honi chahiye' };
  if (file.type && !ACCEPTED.has(file.type)) return { error: 'Sirf JPG, PNG, WebP ya HEIC photo chalegi' };

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(input, { failOn: 'error' }).rotate(); // honour EXIF orientation
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) return { error: 'Photo padhi nahi ja saki' };

    const data = await pipeline
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return {
      data: data.data,
      mimeType: 'image/webp',
      width: data.info.width,
      height: data.info.height,
      bytes: data.info.size,
    };
  } catch {
    return { error: 'Yeh file image nahi lagti' };
  }
}
