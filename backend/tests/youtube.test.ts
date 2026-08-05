import { describe, expect, it } from 'vitest';
import { extractYouTubeVideoId, isValidYouTubeUrl } from '../src/lib/youtube.js';

/**
 * The server validates video links as well as the client, because a browser-side check is
 * a UX affordance rather than a control — anyone can POST to /stretches directly, and the
 * catalogue is shared with every user.
 */
describe('YouTube URL validation (server-side)', () => {
  it('accepts the URL shapes YouTube hands out', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects dangerous schemes and foreign hosts', () => {
    expect(isValidYouTubeUrl('javascript:alert(1)')).toBe(false);
    expect(isValidYouTubeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidYouTubeUrl('https://evil.example.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isValidYouTubeUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  it('rejects malformed input and wrong-shaped ids', () => {
    expect(isValidYouTubeUrl('not a url')).toBe(false);
    expect(isValidYouTubeUrl(undefined)).toBe(false);
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=short')).toBe(false);
  });
});
