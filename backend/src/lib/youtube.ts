/**
 * YouTube URL validation.
 *
 * The stretch catalogue is shared: a URL one user saves is rendered in an iframe for every
 * other user. The old code did `bypassSecurityTrustResourceUrl` on whatever string arrived,
 * after a naive `watch?v=` → `embed/` replace — so any URL at all, including `javascript:`
 * or an attacker's page, could be framed for everyone (FRONTEND_IMPROVEMENT_PLAN.md P1.3).
 *
 * Validated here as well as in the client: a browser-side check is a UX affordance, not a
 * control, since anyone can POST to the API directly.
 *
 * The fix is not to sanitise the input but to **stop using it as a URL**. Only an 11-char
 * video id is extracted, and the embed URL is rebuilt from that id. Nothing the user typed
 * ever reaches the iframe.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/** Returns the video id, or null if this is not a YouTube URL we recognise. */
export function extractYouTubeVideoId(input: string | undefined | null): string | null {
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  // Blocks javascript:, data:, and anything else that is not plain web traffic.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

  const candidate =
    url.searchParams.get('v') ??
    (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/v/')
      ? url.pathname.split('/')[2]
      : url.hostname.toLowerCase().endsWith('youtu.be')
        ? url.pathname.slice(1)
        : null);

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/** A privacy-preserving embed URL built entirely from a validated id. */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function isValidYouTubeUrl(input: string | undefined | null): boolean {
  return extractYouTubeVideoId(input) !== null;
}
