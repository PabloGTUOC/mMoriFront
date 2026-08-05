import { extractYouTubeVideoId, isValidYouTubeUrl, youTubeEmbedUrl } from './youtube';

/**
 * The stretch catalogue is shared, so a link one user saves is framed for everyone. These
 * cases are the difference between that being a video player and an open redirect into an
 * iframe (FRONTEND_IMPROVEMENT_PLAN.md P1.3).
 */
describe('YouTube URL validation', () => {
  it('accepts the URL shapes YouTube actually hands out', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('rejects dangerous schemes', () => {
    expect(extractYouTubeVideoId('javascript:alert(1)')).toBeNull();
    expect(extractYouTubeVideoId('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects other hosts, including ones that merely mention youtube', () => {
    expect(extractYouTubeVideoId('https://evil.example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYouTubeVideoId('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYouTubeVideoId('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('rejects malformed input and ids of the wrong shape', () => {
    expect(extractYouTubeVideoId('not a url')).toBeNull();
    expect(extractYouTubeVideoId('')).toBeNull();
    expect(extractYouTubeVideoId(null)).toBeNull();
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=has/slash1')).toBeNull();
  });

  /** The embed URL is built from the id, so nothing the user typed reaches the iframe. */
  it('builds the embed URL from the id alone', () => {
    expect(youTubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });

  it('exposes a boolean helper', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('https://evil.example.com')).toBe(false);
  });
});
