'use client';

/**
 * Shrinks and re-encodes a picked photo before it is uploaded.
 *
 * This used to happen on the server with sharp, which cannot run on
 * Cloudflare's runtime. Doing it here is actually kinder to the person
 * uploading — a 6 MB phone photo becomes a few hundred KB before it ever
 * leaves their data connection.
 *
 * The server still checks the real file signature and dimensions; nothing here
 * is trusted. If anything goes wrong we hand back the original file and let
 * the server decide.
 */

export const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    // createImageBitmap honours EXIF orientation, which a plain <img> does not.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY),
    );
    // Older Safari silently ignores the webp request and returns a PNG, which
    // can be larger than the original — keep whichever is smaller.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

/** Runs the files one at a time; a phone doing eight at once runs out of memory. */
export async function resizeAll(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) out.push(await resizeImage(f));
  return out;
}

/** Swaps every file under `field` for a resized copy, in place. */
export async function resizeFormPhotos(data: FormData, field = 'photos'): Promise<void> {
  const files = data.getAll(field).filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length === 0) return;
  const resized = await resizeAll(files);
  data.delete(field);
  for (const f of resized) data.append(field, f);
}
