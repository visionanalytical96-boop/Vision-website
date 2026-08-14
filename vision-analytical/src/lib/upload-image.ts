import 'server-only';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { customAlphabet } from 'nanoid';

// `require('sharp')` hands back the callable itself, not the module namespace
// that `import` would give — so the type is the default export, not the module.
type SharpFactory = (typeof import('sharp'))['default'];

/**
 * Loads sharp through Node's own resolver rather than `await import('sharp')`.
 *
 * Turbopack compiles that dynamic import into an async "external module"
 * wrapper (`[externals]_sharp_*.js`). sharp's binding loader tries each
 * candidate native module in turn and, if none load, walks the collected
 * errors reading `err.code` to compose its message. Errors raised by the
 * wrapper carry no `code`, so the loader dies on `err.code.endsWith(...)` and
 * the genuine reason is replaced by an unrelated TypeError — which is exactly
 * what production reported while the binary itself loaded fine by hand.
 *
 * Resolving from the working directory keeps this correct in the standalone
 * build, where server.js runs from the app root and node_modules sits beside it.
 */
const nodeRequire = createRequire(path.join(process.cwd(), 'index.js'));

let cachedSharp: SharpFactory | null = null;

function loadSharp(): SharpFactory {
  if (cachedSharp) return cachedSharp;

  try {
    cachedSharp = nodeRequire('sharp') as SharpFactory;
    return cachedSharp;
  } catch (error) {
    // Say which bindings are actually present, because sharp's own report is
    // the thing that failed. Without this the log is a bare TypeError and the
    // next person has nothing to go on.
    const candidates = [
      `@img/sharp-${process.platform}-${process.arch}/sharp.node`,
      '@img/sharp-wasm32/sharp.node',
    ];
    const findings = candidates.map((id) => {
      try {
        nodeRequire.resolve(id);
        return `${id}: present`;
      } catch {
        return `${id}: missing`;
      }
    });

    throw new Error(
      `Image processing is unavailable: sharp failed to load on ${process.platform}-${process.arch}. ` +
        `${findings.join('; ')}. Original error: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

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

  // Loaded here and not at module scope: sharp is a native module, and a
  // top-level import drags its binary loading into every route that reaches
  // this file's callers (blog/products/CMS/media admin actions), including
  // Next's build-time page-data collection for routes that never upload
  // anything. `loadSharp` caches, so this costs one require per process.
  const sharp = loadSharp();

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
