import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

/**
 * Serves uploaded images with a live filesystem read. `output: standalone`
 * only knows about files present in public/ at build time (traced once into
 * the server bundle) - it never re-scans the directory, so files written by
 * saveUploadedImage() after the server has started are invisible to Next's
 * built-in static file serving. This route bypasses that entirely.
 */
export async function GET(_request: Request, ctx: RouteContext<'/uploads/[...path]'>) {
  const { path: segments } = await ctx.params;

  if (segments.some((segment) => segment === '..' || segment.includes('/') || segment.includes('\\'))) {
    return new Response(null, { status: 400 });
  }

  const filePath = path.join(UPLOADS_ROOT, ...segments);
  if (filePath !== UPLOADS_ROOT && !filePath.startsWith(UPLOADS_ROOT + path.sep)) {
    return new Response(null, { status: 400 });
  }

  try {
    const [buffer, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(fileStat.size),
        // Filenames are random IDs minted per upload and never reused, so a
        // given URL's bytes never change - safe to cache indefinitely.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
