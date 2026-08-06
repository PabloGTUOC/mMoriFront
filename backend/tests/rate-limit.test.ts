import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { rateLimit } from '../src/middleware/rate-limit.js';

/**
 * Covers 4.2.5. The endpoint this protects spends real money per call, so the cases that
 * matter are that the limit actually bites, and that one caller cannot exhaust another's
 * quota.
 */
function createApp(limit: number, windowMs: number, uid?: string) {
  const app = express();
  if (uid !== undefined) {
    // Stand in for requireAuth, which runs first in the real chain.
    app.use((req, _res, next) => {
      req.auth = { uid: req.header('x-test-uid') ?? uid };
      next();
    });
  }
  app.use(rateLimit({ limit, windowMs, message: 'Too many requests.' }));
  app.get('/probe', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('rateLimit', () => {
  it('allows requests up to the limit', async () => {
    const app = createApp(3, 60_000, 'user-1');
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/probe')).status).toBe(200);
    }
  });

  it('rejects the request after the limit with 429 and Retry-After', async () => {
    const app = createApp(2, 60_000, 'user-1');
    await request(app).get('/probe');
    await request(app).get('/probe');

    const response = await request(app).get('/probe');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ success: false, message: 'Too many requests.' });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  /**
   * The reason the limiter keys on the verified uid rather than the IP: in tests and behind
   * a NAT alike, several users share one address.
   */
  it('tracks each user separately', async () => {
    const app = createApp(1, 60_000, 'ignored');

    expect((await request(app).get('/probe').set('x-test-uid', 'user-a')).status).toBe(200);
    expect((await request(app).get('/probe').set('x-test-uid', 'user-b')).status).toBe(200);
    expect((await request(app).get('/probe').set('x-test-uid', 'user-a')).status).toBe(429);
  });

  it('lets the caller through again once the window has passed', async () => {
    const app = createApp(1, 1, 'user-1');
    expect((await request(app).get('/probe')).status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect((await request(app).get('/probe')).status).toBe(200);
  });

  it('falls back to the client address when nobody is signed in', async () => {
    const app = createApp(1, 60_000);
    expect((await request(app).get('/probe')).status).toBe(200);
    expect((await request(app).get('/probe')).status).toBe(429);
  });
});
