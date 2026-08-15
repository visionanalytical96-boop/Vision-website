import 'server-only';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { toImageList } from '@/lib/image-list';
import { heroContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_HERO_CONTENT } from '@/lib/cms/defaults';
import { HomeSectionKey } from '@/generated/prisma/client';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

export interface MediaFile {
  url: string;
  category: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: Date;
  inUse: boolean;
}

export async function listMediaFiles(): Promise<MediaFile[]> {
  const categoryEntries = await readdir(UPLOAD_ROOT, { withFileTypes: true }).catch(() => []);
  const files: Omit<MediaFile, 'inUse'>[] = [];

  for (const entry of categoryEntries) {
    if (!entry.isDirectory()) continue;
    const categoryDir = path.join(UPLOAD_ROOT, entry.name);
    const filenames = await readdir(categoryDir).catch(() => []);
    for (const filename of filenames) {
      const filePath = path.join(categoryDir, filename);
      const stats = await stat(filePath).catch(() => null);
      if (!stats?.isFile()) continue;
      files.push({
        url: `/uploads/${entry.name}/${filename}`,
        category: entry.name,
        filename,
        sizeBytes: stats.size,
        uploadedAt: stats.mtime,
      });
    }
  }

  const usedUrls = await collectUsedImageUrls();
  const result = files.map((file) => ({ ...file, inUse: usedUrls.has(file.url) }));
  result.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  return result;
}

async function collectUsedImageUrls(): Promise<Set<string>> {
  const used = new Set<string>();

  const [products, refurbished, posts, heroSection, siteSettings] = await Promise.all([
    prisma.product.findMany({ select: { images: true } }),
    prisma.refurbishedInstrument.findMany({ select: { images: true } }),
    prisma.knowledgeArticle.findMany({ select: { coverImage: true } }),
    prisma.homeSection.findUnique({ where: { key: HomeSectionKey.HERO }, select: { content: true } }),
    prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  for (const product of products) {
    for (const url of toImageList(product.images)) used.add(url);
  }
  for (const item of refurbished) {
    for (const url of toImageList(item.images)) used.add(url);
  }
  for (const post of posts) {
    if (post.coverImage) used.add(post.coverImage);
  }
  if (heroSection) {
    const hero = parseContent(heroContentSchema, heroSection.content, DEFAULT_HERO_CONTENT);
    if (hero.backgroundImage) used.add(hero.backgroundImage);
  }
  if (siteSettings?.logoUrl) used.add(siteSettings.logoUrl);
  if (siteSettings?.faviconUrl) used.add(siteSettings.faviconUrl);

  return used;
}

export async function deleteMediaFile(url: string): Promise<{ error?: string }> {
  if (!url.startsWith('/uploads/')) return { error: 'Invalid file.' };

  const relative = url.slice('/uploads/'.length);
  const filePath = path.join(UPLOAD_ROOT, relative);
  if (path.relative(UPLOAD_ROOT, filePath).startsWith('..')) {
    return { error: 'Invalid file.' };
  }

  try {
    await unlink(filePath);
  } catch {
    return { error: 'Could not delete that file.' };
  }
  return {};
}
