import 'server-only';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 16);

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export type UploadCategory = 'products' | 'refurbished' | 'blog' | 'site';

export interface UploadImageResult {
  url: string | null;
  error?: string;
}

/**
 * Validates and persists an uploaded image. Always decodes and re-encodes
 * through sharp - never trusts the raw bytes or the browser-reported MIME
 * type - so the output is guaranteed to be a genuine image with any
 * embedded metadata/payload stripped, regardless of what was uploaded.
 */
export async function saveUploadedImage(file: File | null, category: UploadCategory): Promise<UploadImageResult> {
  if (!file || file.size === 0) return { url: null };

  if (file.size > MAX_UPLOAD_BYTES) {
    return { url: null, error: 'Image must be smaller than 8MB.' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const metadata = await sharp(buffer, { failOn: 'error' })
    .metadata()
    .catch(() => null);
  if (!metadata) {
    return { url: null, error: 'That file could not be read as an image.' };
  }

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    return { url: null, error: 'Upload a JPEG, PNG or WebP image.' };
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', category);
  await mkdir(dir, { recursive: true });

  const filename = `${generateId()}.webp`;

  await sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(dir, filename));

  return { url: `/uploads/${category}/${filename}` };
}
