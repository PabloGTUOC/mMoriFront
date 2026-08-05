import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth } from '../src/middleware/require-auth.js';
import { env } from '../src/config/env.js';
import * as firebase from '../src/config/firebase.js';

/**
 * Token verification is stubbed, so these run with no Firebase credentials and no network —
 * which is what lets them run in CI.
 *
 * `env.authMode` is mutated per test. It is read at request time rather than captured at
 * import, which is what makes the staged rollout switchable without a redeploy.
 */

const verifyIdToken = vi.fn();

vi.spyOn(firebase, 'firebaseAuth').mockReturnValue({
  verifyIdToken,
} as unknown as ReturnType<typeof firebase.firebaseAuth>);

/** Echoes back what the controllers would see, so the uid rewrite is observable. */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requireAuth);
  app.get('/probe', (req, res) => {
    res.json({ auth: req.auth ?? null, queryUserId: req.query['user_id'] ?? null });
  });
  app.post('/probe', (req, res) => {
    res.json({ auth: req.auth ?? null, body: req.body });
  });
  return app;
}

const originalMode = env.authMode;
let app: express.Express;

beforeEach(() => {
  verifyIdToken.mockReset();
  app = createApp();
});

afterEach(() => {
  (env as { authMode: string }).authMode = originalMode;
});

function setMode(mode: 'disabled' | 'optional' | 'required') {
  (env as { authMode: string }).authMode = mode;
}

describe('AUTH_MODE=required', () => {
  beforeEach(() => setMode('required'));

  it('rejects a request with no Authorization header', async () => {
    const response = await request(app).get('/probe');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('rejects a malformed Authorization header', async () => {
    const response = await request(app).get('/probe').set('Authorization', 'Basic abc');
    expect(response.status).toBe(401);
  });

  it('rejects a token the SDK will not verify', async () => {
    verifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));

    const response = await request(app).get('/probe').set('Authorization', 'Bearer expired');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('accepts a valid token and exposes the uid', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'a@b.c' });

    const response = await request(app).get('/probe').set('Authorization', 'Bearer good');

    expect(response.status).toBe(200);
    expect(response.body.auth).toEqual({ uid: 'user-1', email: 'a@b.c' });
  });

  /**
   * The core of the fix. A caller may still send a user_id, but it is replaced by the
   * verified one before any controller reads it — so guessing another uid achieves nothing.
   */
  it('overwrites a query user_id with the verified uid', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-1' });

    const response = await request(app)
      .get('/probe')
      .query({ user_id: 'user-1' })
      .set('Authorization', 'Bearer good');

    expect(response.body.queryUserId).toBe('user-1');
  });

  it('overwrites a wrapped body user_id with the verified uid', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-1' });

    const response = await request(app)
      .post('/probe')
      .send({ weight_update: { user_id: 'user-1', weight: 80 } })
      .set('Authorization', 'Bearer good');

    expect(response.body.body.weight_update.user_id).toBe('user-1');
  });

  it('rejects a body claiming a different user with 403, not a silent rewrite', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-1' });

    const response = await request(app)
      .post('/probe')
      .send({ user_data: { user_id: 'somebody-else' } })
      .set('Authorization', 'Bearer good');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('rejects a query claiming a different user', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-1' });

    const response = await request(app)
      .get('/probe')
      .query({ user_id: 'somebody-else' })
      .set('Authorization', 'Bearer good');

    expect(response.status).toBe(403);
  });
});

describe('AUTH_MODE=optional (the rollout default)', () => {
  beforeEach(() => setMode('optional'));

  it('lets an unauthenticated request through so existing clients keep working', async () => {
    const response = await request(app).get('/probe');
    expect(response.status).toBe(200);
    expect(response.body.auth).toBeNull();
  });

  it('still verifies and applies a token when one is present', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'user-9' });

    const response = await request(app).get('/probe').set('Authorization', 'Bearer good');

    expect(response.body.auth.uid).toBe('user-9');
    expect(response.body.queryUserId).toBe('user-9');
  });

  it('does not reject a bad token, but leaves the request unauthenticated', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));

    const response = await request(app).get('/probe').set('Authorization', 'Bearer bad');

    expect(response.status).toBe(200);
    expect(response.body.auth).toBeNull();
  });
});

describe('AUTH_MODE=disabled', () => {
  it('skips verification entirely', async () => {
    setMode('disabled');

    const response = await request(app).get('/probe').query({ user_id: 'anything' });

    expect(response.status).toBe(200);
    expect(response.body.queryUserId).toBe('anything');
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
