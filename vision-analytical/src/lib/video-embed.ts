/**
 * Hosts a knowledge article may embed a video from.
 *
 * This list must stay in step with `frame-src` in next.config.ts. Validating
 * against it at the boundary is what stops an admin pasting a URL that saves
 * cleanly and then renders as an empty box, blocked by the CSP with nothing to
 * explain why.
 */
export const ALLOWED_VIDEO_HOSTS = ['www.youtube-nocookie.com', 'www.youtube.com', 'player.vimeo.com'] as const;

/**
 * Whether a URL is already an embeddable player.
 *
 * The host alone is not enough: youtube.com serves both the watch page and the
 * player, and only /embed/ can be framed — YouTube refuses the watch page with
 * X-Frame-Options. Checking the path is what stops a pasted watch link being
 * saved as-is and rendering an empty box.
 */
export function isAllowedVideoEmbed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    if (parsed.hostname === 'www.youtube-nocookie.com' || parsed.hostname === 'www.youtube.com') {
      return parsed.pathname.startsWith('/embed/') && parsed.pathname.length > '/embed/'.length;
    }
    if (parsed.hostname === 'player.vimeo.com') {
      return parsed.pathname.startsWith('/video/') && parsed.pathname.length > '/video/'.length;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Turns the URL people actually copy - a youtube.com/watch or youtu.be link -
 * into the embed form, so the admin doesn't have to know the difference.
 * Anything already embeddable is returned unchanged.
 */
export function toVideoEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  if (url === '') return null;
  if (isAllowedVideoEmbed(url)) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}
