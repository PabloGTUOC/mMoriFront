import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

/**
 * Request-guard and routing coverage that never reaches the database.
 *
 * Every case here returns before any Mongo query, so this suite runs everywhere — no
 * database required. It pins down the parts of BACKEND_SPEC §4/§6/§7 that are easiest to
 * break by accident: the wrapper-key requirements, the `UserId is missing` guards, and the
 * fact that failures use `error` on some endpoints and `message` on others.
 */

const app = createApp();

/**
 * These cover the spec's own `UserId is missing` guards (§7), which only fire when nothing
 * upstream has supplied an identity. The suite default of AUTH_MODE=disabled now injects a
 * local development uid for unnamed callers, which would satisfy those guards and make the
 * assertions vacuous — so this file runs in `optional`, where an unauthenticated request
 * reaches the controllers with no user, exactly as the spec describes.
 */
const originalMode = env.authMode;
beforeAll(() => ((env as { authMode: string }).authMode = 'optional'));
afterAll(() => ((env as { authMode: string }).authMode = originalMode));

describe('routing', () => {
  it('answers unknown routes with JSON, not Express HTML', async () => {
    const response = await request(app).get('/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'Not found' });
  });

  it('rejects malformed JSON with 400 rather than 500', async () => {
    const response = await request(app)
      .post('/user_data')
      .set('Content-Type', 'application/json')
      .send('{"user_data": ');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('reports an unhealthy database on /up when disconnected', async () => {
    // No connection is opened in this suite, so /up must say so rather than claim health.
    const response = await request(app).get('/up');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'degraded', database: 'disconnected' });
  });

  it('sends CORS headers for the configured frontend origin', async () => {
    const response = await request(app)
      .get('/does-not-exist')
      .set('Origin', 'http://localhost:4200');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });
});

describe('strong-parameter wrappers (§6)', () => {
  it('requires the user_data wrapper on POST /user_data', async () => {
    const response = await request(app).post('/user_data').send({ user_id: 'abc123' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('requires the training wrapper on POST /trainings', async () => {
    const response = await request(app).post('/trainings').send({ user_id: 'abc123' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('UserId guards (§7)', () => {
  it.each([
    '/trainings/latest-trainings',
    '/trainings/initial-trainings',
    '/trainings/all-trainings',
    '/trainings/training-stats',
  ])('rejects %s without a user_id', async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'UserId is missing' });
  });

  it('rejects POST /weight_updates with no wrapper', async () => {
    const response = await request(app).post('/weight_updates').send({ weight: 77.4 });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'UserId is missing' });
  });

  it('rejects POST /weight_updates with a blank user_id', async () => {
    const response = await request(app)
      .post('/weight_updates')
      .send({ weight_update: { user_id: '  ', weight: 77.4, date: '2024-08-10' } });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'UserId is missing' });
  });
});

describe('POST /moods parameter guard (§4.14)', () => {
  it.each([
    ['missing mood', { mood_data: { user_id: 'abc123', date: '2024-08-25' } }],
    ['missing user_id', { mood_data: { mood: 'calm', date: '2024-08-25' } }],
    ['missing date', { mood_data: { user_id: 'abc123', mood: 'calm' } }],
  ])('answers 400 Missing parameters when %s', async (_label, body) => {
    const response = await request(app).post('/moods').send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Missing parameters' });
  });

  /**
   * §4.14 records that Rails raised NoMethodError → 500 when `mood_data` was absent
   * entirely. That is a crash, not a contract; this asserts the documented 400 instead.
   */
  it('answers 400 rather than 500 when the mood_data wrapper is absent', async () => {
    const response = await request(app).post('/moods').send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Missing parameters' });
  });
});
