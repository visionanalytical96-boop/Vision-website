import { redirect } from 'next/navigation';
import { getPublishedDownloadBySlug, recordDownload } from '@/lib/data/downloads';
import { getSession } from '@/lib/dal';

/**
 * Counts the download, then hands off to the file itself. Going through a
 * route rather than linking the file directly is what makes the count possible
 * and gives gated documents somewhere to check the session.
 */
export async function GET(_request: Request, ctx: RouteContext<'/downloads/[slug]/file'>) {
  const { slug } = await ctx.params;

  const download = await getPublishedDownloadBySlug(slug);
  if (!download) {
    return new Response('Not found', { status: 404 });
  }

  if (download.requiresLogin && !(await getSession())) {
    redirect(`/login?next=${encodeURIComponent(`/downloads/${slug}/file`)}`);
  }

  // fileUrl is admin-set, but this route is public: refuse anything that isn't
  // a same-origin path or an ordinary http(s) URL.
  const isSafeTarget =
    download.fileUrl.startsWith('/') || /^https?:\/\//i.test(download.fileUrl);
  if (!isSafeTarget) {
    return new Response('Not found', { status: 404 });
  }

  await recordDownload(download.id);
  redirect(download.fileUrl);
}
