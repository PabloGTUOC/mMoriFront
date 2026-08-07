import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearDatabase, startTestMongo, type TestMongo } from './helpers/mongo.js';
import { queryChatGpt } from '../src/services/openai.service.js';

/**
 * The OpenAI call is stubbed so these tests never reach the network and never depend on
 * whether an API key happens to be present in the environment. `buildPrompt` stays real —
 * the prompt wording is part of the spec (§4.15) and is asserted below.
 */
vi.mock('../src/services/openai.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/openai.service.js')>();
  return { ...actual, queryChatGpt: vi.fn() };
});

const queryChatGptMock = vi.mocked(queryChatGpt);

/**
 * End-to-end coverage of every route in BACKEND_SPEC §4, against a real MongoDB.
 *
 * Skipped automatically when no database can be reached — see `helpers/mongo.ts`.
 *
 * Two things are being checked throughout: that the response shapes match the spec
 * (including its inconsistencies, which clients branch on), and that the payloads the
 * Angular frontend actually sends are accepted. The second group is marked
 * "frontend payload" and is the reason several endpoints take field aliases.
 */

const mongo: TestMongo | null = await startTestMongo();

describe.skipIf(mongo === null)('API integration', () => {
  let app: Express;

  beforeAll(async () => {
    await mongoose.connect(mongo!.uri);
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo!.stop();
  });

  beforeEach(async () => {
    await clearDatabase();
    queryChatGptMock.mockReset();
  });

  /** The reference dataset has no model class; tests seed it directly (§3.7). */
  async function seedLifeExpectancy(): Promise<void> {
    await mongoose.connection.db!.collection('life_expectancy').insertOne({
      Country_Code: 'ESP',
      Gender: 'Male',
      Type: 'LifeExpectancy_Gen',
      Years: 83.2,
    });
  }

  const profile = {
    user_id: 'abc123',
    dob: '1990-05-14',
    gender: 'Male',
    height: 180,
    weight: 78,
    training_frequency: 3,
    smoking_status: false,
    drinking_status: true,
    country: 'ESP',
  };

  describe('GET /up', () => {
    it('reports a healthy database once connected', async () => {
      const response = await request(app).get('/up');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    });
  });

  describe('POST /user_data (§4.1)', () => {
    it('creates a profile and returns 201 with an $oid', async () => {
      const response = await request(app).post('/user_data').send({ user_data: profile });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.inserted_id.$oid).toMatch(/^[0-9a-f]{24}$/);
    });

    it('returns 422 with full messages when required fields are blank', async () => {
      const response = await request(app)
        .post('/user_data')
        .send({ user_data: { user_id: 'abc123' } });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.stringContaining("can't be blank")])
      );
    });

    /**
     * Frontend payload. `FirstTimeComponent` submits `trainingFrequency`, `smoker`,
     * `drinker` and `country_code`. Against the Rails backend strong parameters drop all
     * four and the record 422s on its presence validations, so signup could not complete.
     */
    it('accepts the signup form payload the Angular app actually sends', async () => {
      const response = await request(app)
        .post('/user_data')
        .send({
          user_data: {
            user_id: 'abc123',
            dob: '1990-05-14',
            gender: 'Male',
            height: 180,
            weight: 78,
            trainingFrequency: 3,
            smoker: false,
            drinker: true,
            country_code: 'ESP',
          },
        });

      expect(response.status).toBe(201);

      const stored = await mongoose.connection.db!.collection('user_data').findOne({});
      expect(stored).toMatchObject({
        training_frequency: 3,
        smoking_status: false,
        drinking_status: true,
        country: 'ESP',
      });
    });
  });

  describe('GET /user_data/user_data (§4.2)', () => {
    it('returns the newest profile with base and adjusted life expectancy', async () => {
      await seedLifeExpectancy();
      await request(app).post('/user_data').send({ user_data: profile });

      const response = await request(app)
        .get('/user_data/user_data')
        .query({ user_id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user_data.dob).toBe('1990-05-14');
      expect(response.body.user_data._id.$oid).toMatch(/^[0-9a-f]{24}$/);
      expect(response.body.base_life_expectancy).toBe(83.2);
      // 83.2, drinker -4, BMI 24.07 → 0, trains 3x → +6.
      expect(response.body.adjusted_life_expectancy).toBeCloseTo(85.2, 6);
    });

    it('prefers the latest weigh-in over the profile weight', async () => {
      await seedLifeExpectancy();
      await request(app).post('/user_data').send({ user_data: profile });
      await request(app)
        .post('/weight_updates')
        .send({ weight_update: { user_id: 'abc123', date: '2024-08-10', weight: 95 } });

      const response = await request(app)
        .get('/user_data/user_data')
        .query({ user_id: 'abc123' });

      // BMI at 95kg is 29.32 → -3 instead of 0, so 3 years lower than the case above.
      expect(response.body.adjusted_life_expectancy).toBeCloseTo(82.2, 6);
    });

    it('returns base 0 when the life_expectancy collection has no matching row', async () => {
      await request(app).post('/user_data').send({ user_data: profile });

      const response = await request(app)
        .get('/user_data/user_data')
        .query({ user_id: 'abc123' });

      expect(response.body.base_life_expectancy).toBe(0);
    });

    it('answers 200 with success:false when the user has no profile', async () => {
      const response = await request(app)
        .get('/user_data/user_data')
        .query({ user_id: 'nobody' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, message: 'No data found' });
    });

    it('does not leak another user when user_id is omitted', async () => {
      await request(app).post('/user_data').send({ user_data: profile });

      const response = await request(app).get('/user_data/user_data');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, message: 'No data found' });
    });
  });

  describe('trainings (§4.3–§4.7)', () => {
    it('logs a session and returns 201', async () => {
      const response = await request(app)
        .post('/trainings')
        .send({
          training: {
            user_id: 'abc123',
            training_date: '2024-06-14',
            training_type: 'Running',
            duration: 45,
            calories_burned: 400,
            description: 'Morning run',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.inserted_id.$oid).toMatch(/^[0-9a-f]{24}$/);
    });

    /**
     * Frontend payload. `InputDailyComponent` posts `{ user_id, date, training }`; the
     * spec permits `training_date` and `training_type`, so Rails stored a row of nulls.
     */
    it('maps the daily-input payload onto training_date and training_type', async () => {
      await request(app)
        .post('/trainings')
        .send({ training: { user_id: 'abc123', date: '2024-06-14', training: 'Running' } });

      const stored = await mongoose.connection.db!.collection('trainings').findOne({});
      expect(stored).toMatchObject({
        user_id: 'abc123',
        training_date: '2024-06-14',
        training_type: 'Running',
      });
    });

    it('returns the newest and oldest session under the singular `training` key', async () => {
      for (const date of ['2024-06-14', '2024-07-01', '2024-05-02']) {
        await request(app)
          .post('/trainings')
          .send({ training: { user_id: 'abc123', training_date: date, training_type: date } });
      }

      const latest = await request(app)
        .get('/trainings/latest-trainings')
        .query({ user_id: 'abc123' });
      expect(latest.body.training.training_date).toBe('2024-07-01');

      const initial = await request(app)
        .get('/trainings/initial-trainings')
        .query({ user_id: 'abc123' });
      expect(initial.body.training.training_date).toBe('2024-05-02');
    });

    it('uses `error` for an empty single read but `message` for an empty list read', async () => {
      const latest = await request(app)
        .get('/trainings/latest-trainings')
        .query({ user_id: 'abc123' });
      expect(latest.status).toBe(200);
      expect(latest.body).toEqual({ success: false, error: 'No training data found' });

      const all = await request(app)
        .get('/trainings/all-trainings')
        .query({ user_id: 'abc123' });
      expect(all.status).toBe(200);
      expect(all.body).toEqual({ success: false, message: 'No data found' });
    });

    it('lists all sessions oldest first', async () => {
      for (const date of ['2024-07-01', '2024-05-02']) {
        await request(app)
          .post('/trainings')
          .send({ training: { user_id: 'abc123', training_date: date } });
      }

      const response = await request(app)
        .get('/trainings/all-trainings')
        .query({ user_id: 'abc123' });

      expect(response.body.success).toBe(true);
      expect(response.body.trainings.map((t: { training_date: string }) => t.training_date)).toEqual(
        ['2024-05-02', '2024-07-01']
      );
    });

    it('returns training-stats counted against the first login', async () => {
      await request(app).post('/user_data').send({ user_data: profile });
      await request(app)
        .post('/trainings')
        .send({ training: { user_id: 'abc123', training_date: '2024-06-14' } });

      const response = await request(app)
        .get('/trainings/training-stats')
        .query({ user_id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.training_count).toBe(1);
      // The join day counts as day one. This asserted 0, which made the frontend's
      // "% days trained" read 0% for a user who signed up and trained the same day.
      expect(response.body.total_days_since_joining).toBe(1);
      expect(response.body.first_login_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    describe('DELETE /trainings/:id (additive)', () => {
      async function logTraining(user_id: string) {
        const created = await request(app)
          .post('/trainings')
          .send({ training: { user_id, training_date: '2024-06-14', training_type: 'Push' } });
        return created.body.inserted_id.$oid as string;
      }

      it('removes the caller’s own session', async () => {
        const id = await logTraining('abc123');

        const response = await request(app)
          .delete(`/trainings/${id}`)
          .query({ user_id: 'abc123' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });

        const all = await request(app)
          .get('/trainings/all-trainings')
          .query({ user_id: 'abc123' });
        expect(all.body.success).toBe(false);
      });

      it('will not delete another user’s session', async () => {
        const id = await logTraining('someone-else');

        const response = await request(app)
          .delete(`/trainings/${id}`)
          .query({ user_id: 'abc123' });

        expect(response.status).toBe(404);

        const all = await request(app)
          .get('/trainings/all-trainings')
          .query({ user_id: 'someone-else' });
        expect(all.body.trainings).toHaveLength(1);
      });

      /** Deleting a session has to move the dashboard figure it feeds. */
      it('is reflected in training-stats', async () => {
        await request(app).post('/user_data').send({ user_data: profile });
        const id = await logTraining('abc123');

        await request(app).delete(`/trainings/${id}`).query({ user_id: 'abc123' });

        const stats = await request(app)
          .get('/trainings/training-stats')
          .query({ user_id: 'abc123' });
        expect(stats.body.training_count).toBe(0);
      });
    });

    it('counts days trained, not sessions logged', async () => {
      await request(app).post('/user_data').send({ user_data: profile });
      // Two sessions on one day, one on another: two days trained, not three.
      for (const training_date of ['2024-06-14', '2024-06-14', '2024-06-15']) {
        await request(app)
          .post('/trainings')
          .send({ training: { user_id: 'abc123', training_date } });
      }

      const response = await request(app)
        .get('/trainings/training-stats')
        .query({ user_id: 'abc123' });

      expect(response.body.training_count).toBe(2);
    });

    it('is the only endpoint that returns a real 404', async () => {
      const response = await request(app)
        .get('/trainings/training-stats')
        .query({ user_id: 'nobody' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ success: false, error: 'No user data found' });
    });
  });

  describe('training catalogue (§4.8–§4.9)', () => {
    it('reports an empty catalogue as success:false with a 200', async () => {
      const response = await request(app).get('/training-repository');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: false,
        message: 'No training repository data found',
      });
    });

    it('creates an entry under the `training` wrapper and echoes it in an array', async () => {
      const response = await request(app)
        .post('/training-repository')
        .send({
          training: {
            name: 'HIIT',
            type: 'Cardio',
            duration: 30,
            calories: 350,
            description: 'High intensity intervals',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({ name: 'HIIT', type: 'Cardio' });
    });

    /**
     * Frontend payload. The add-training form submits `training_name`, and both
     * `TrainingItemComponent` and the daily picker read `training_name` back.
     */
    it('accepts training_name on write and mirrors it on read', async () => {
      await request(app)
        .post('/training-repository')
        .send({
          training: {
            training_name: 'HIIT',
            type: 'Cardio',
            duration: 30,
            calories: 350,
            description: 'High intensity intervals',
          },
        });

      const response = await request(app).get('/training-repository');
      expect(response.body.data[0].name).toBe('HIIT');
      expect(response.body.data[0].training_name).toBe('HIIT');
    });

    /**
     * 4.3.3: the catalogue is global, so a bad entry needs to be traceable to whoever added
     * it — but the uid is recorded, not published. Broadcasting other users' uids to every
     * client would be a privacy leak of its own.
     */
    it('records who created an entry without exposing it', async () => {
      const response = await request(app)
        .post('/training-repository')
        .send({ training: { name: 'HIIT', type: 'Cardio' } });

      expect(response.body.data[0]).not.toHaveProperty('created_by');

      const list = await request(app).get('/training-repository');
      expect(list.body.data[0]).not.toHaveProperty('created_by');

      // Stored all the same — undefined here because these tests run unauthenticated.
      const stored = await mongoose.connection.db!.collection('training_repository').findOne({});
      expect(stored).toHaveProperty('name', 'HIIT');
    });

    it('keeps `type` a plain string despite the reserved-ish name (§3.5)', async () => {
      await request(app)
        .post('/training-repository')
        .send({ training: { name: 'HIIT', type: 'Cardio' } });

      const stored = await mongoose.connection.db!.collection('training_repository').findOne({});
      expect(stored!['type']).toBe('Cardio');
      expect(stored).not.toHaveProperty('_type');
    });
  });

  /**
   * Catalogues were global — one list everyone saw and everyone wrote to. They are now
   * per-user, with discovery and import as the deliberate way across.
   */
  describe('catalogue ownership (additive)', () => {
    async function addTraining(user_id: string, name: string) {
      const created = await request(app)
        .post('/training-repository')
        .send({ training: { user_id, name, type: 'Strength' } });
      return created.body.data[0]._id.$oid as string;
    }

    it('lists only your own entries', async () => {
      await addTraining('me', 'Push day');
      await addTraining('someone-else', 'Their session');

      const mine = await request(app).get('/training-repository').query({ user_id: 'me' });

      expect(mine.body.data).toHaveLength(1);
      expect(mine.body.data[0].name).toBe('Push day');
    });

    it('discovery shows everyone else and never yourself', async () => {
      await addTraining('me', 'Push day');
      await addTraining('someone-else', 'Their session');

      const found = await request(app)
        .get('/training-repository/discover')
        .query({ user_id: 'me' });

      expect(found.body.data.map((e: { name: string }) => e.name)).toEqual(['Their session']);
    });

    it('attributes an entry to its author by name, never by uid', async () => {
      await addTraining('someone-else', 'Their session');

      const found = await request(app)
        .get('/training-repository/discover')
        .query({ user_id: 'me' });

      // AUTH_MODE=disabled names the dev identity; what matters is the shape.
      expect(found.body.data[0]).toHaveProperty('created_by_name');
      expect(found.body.data[0]).not.toHaveProperty('created_by');
    });

    it('searches by name', async () => {
      await addTraining('someone-else', 'Hamstring work');
      await addTraining('someone-else', 'Push day');

      const found = await request(app)
        .get('/training-repository/discover')
        .query({ user_id: 'me', q: 'hamstring' });

      expect(found.body.data.map((e: { name: string }) => e.name)).toEqual(['Hamstring work']);
    });

    /** A search box reaching a RegExp unescaped is how it becomes a way to pin the database. */
    it('treats regex metacharacters as literal text', async () => {
      await addTraining('someone-else', 'Push day');

      const found = await request(app)
        .get('/training-repository/discover')
        .query({ user_id: 'me', q: '.*' });

      expect(found.status).toBe(200);
      expect(found.body.data).toEqual([]);
    });

    it('imports a copy that survives the original being deleted', async () => {
      const id = await addTraining('someone-else', 'Their session');

      const imported = await request(app)
        .post(`/training-repository/${id}/import`)
        .query({ user_id: 'me' });
      expect(imported.status).toBe(201);

      await request(app)
        .delete(`/training-repository/${id}`)
        .query({ user_id: 'someone-else' });

      const mine = await request(app).get('/training-repository').query({ user_id: 'me' });
      expect(mine.body.data).toHaveLength(1);
      expect(mine.body.data[0].name).toBe('Their session');
    });

    it('importing the same entry twice is a no-op, not a duplicate', async () => {
      const id = await addTraining('someone-else', 'Their session');

      await request(app).post(`/training-repository/${id}/import`).query({ user_id: 'me' });
      const second = await request(app)
        .post(`/training-repository/${id}/import`)
        .query({ user_id: 'me' });

      expect(second.status).toBe(200);

      const mine = await request(app).get('/training-repository').query({ user_id: 'me' });
      expect(mine.body.data).toHaveLength(1);
    });

    it('will not delete another user’s catalogue entry', async () => {
      const id = await addTraining('someone-else', 'Their session');

      const response = await request(app)
        .delete(`/training-repository/${id}`)
        .query({ user_id: 'me' });

      expect(response.status).toBe(404);
    });

    it('scopes the stretch catalogue the same way', async () => {
      await request(app)
        .post('/stretches')
        .send({ stretch: { user_id: 'someone-else', name: 'Hamstring' } });

      const mine = await request(app).get('/stretches').query({ user_id: 'me' });
      expect(mine.body.data).toEqual([]);

      const found = await request(app).get('/stretches/discover').query({ user_id: 'me' });
      expect(found.body.data).toHaveLength(1);
    });
  });

  describe('stretch catalogue (§4.10–§4.11)', () => {
    it('reports an empty catalogue as success:true with an empty array', async () => {
      const response = await request(app).get('/stretches');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: [] });
    });

    it('returns 200 rather than 201 on create, unlike every other create', async () => {
      const response = await request(app)
        .post('/stretches')
        .send({ stretch: { name: 'Hamstring', type: 'Static', duration: 60 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    /**
     * Frontend payload. `StretchRepositoryComponent` posts the bare form value — no
     * `stretch` wrapper — with `stretch_name` and `video_link`. Rails answered 400 on the
     * missing wrapper, and had no `video_link` field for the embedded player to read.
     */
    it('does not expose created_by on stretches either', async () => {
      await request(app)
        .post('/stretches')
        .send({ stretch: { name: 'Hamstring', type: 'Static' } });

      const list = await request(app).get('/stretches');
      expect(list.body.data[0]).not.toHaveProperty('created_by');
    });

    it('accepts the unwrapped form payload and persists video_link', async () => {
      const response = await request(app).post('/stretches').send({
        stretch_name: 'Hamstring stretch',
        description: 'Hold for 60 seconds',
        video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const list = await request(app).get('/stretches');
      expect(list.body.data[0]).toMatchObject({
        name: 'Hamstring stretch',
        stretch_name: 'Hamstring stretch',
        video_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
    });
  });

  describe('weight updates (§4.12–§4.13)', () => {
    it('records a weigh-in and reads it back as YYYY-MM-DD', async () => {
      const create = await request(app)
        .post('/weight_updates')
        .send({ weight_update: { user_id: 'abc123', date: '2024-08-10', weight: 77.4 } });
      expect(create.status).toBe(201);

      const response = await request(app)
        .get('/weight_updates/latest_weight')
        .query({ user_id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, weight: 77.4, date: '2024-08-10' });
    });

    /**
     * This used to be "breaks same-day ties by insertion order, latest wins" — three rows
     * for one date, read back newest-first. There are no ties now: a second reading on the
     * same day replaces the first, so the history chart cannot draw two points at one x
     * and a mistyped figure can be corrected by re-entering it.
     */
    it('replaces a same-day weigh-in rather than appending one', async () => {
      for (const weight of [80, 81, 82]) {
        await request(app)
          .post('/weight_updates')
          .send({ weight_update: { user_id: 'abc123', date: '2024-08-10', weight } });
      }

      const response = await request(app)
        .get('/weight_updates/latest_weight')
        .query({ user_id: 'abc123' });

      expect(response.body.weight).toBe(82);

      // One row, not three. Matched loosely: the series also carries `_id`, which the
      // history screen needs in order to delete an entry.
      const history = await request(app)
        .get('/weight_updates/history')
        .query({ user_id: 'abc123' });

      expect(history.body.data).toHaveLength(1);
      expect(history.body.data[0]).toMatchObject({ date: '2024-08-10', weight: 82 });
    });

    it('keeps weigh-ins on different days as separate entries', async () => {
      for (const [date, weight] of [['2024-08-10', 80], ['2024-08-11', 79]] as const) {
        await request(app)
          .post('/weight_updates')
          .send({ weight_update: { user_id: 'abc123', date, weight } });
      }

      const history = await request(app)
        .get('/weight_updates/history')
        .query({ user_id: 'abc123' });

      expect(history.body.data).toHaveLength(2);
    });

    it('answers 200 with success:false when there is no weight history', async () => {
      const response = await request(app)
        .get('/weight_updates/latest_weight')
        .query({ user_id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, error: 'No weight data found' });
    });

    describe('DELETE /weight_updates/:id (additive)', () => {
      async function createWeighIn(user_id: string) {
        const created = await request(app)
          .post('/weight_updates')
          .send({ weight_update: { user_id, date: '2024-08-10', weight: 77.4 } });
        return created.body.inserted_id.$oid as string;
      }

      it('removes the caller’s own weigh-in', async () => {
        const id = await createWeighIn('abc123');

        const response = await request(app)
          .delete(`/weight_updates/${id}`)
          .query({ user_id: 'abc123' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });

        const history = await request(app)
          .get('/weight_updates/history')
          .query({ user_id: 'abc123' });
        expect(history.body.data).toEqual([]);
      });

      /** Ownership is in the filter, so another user's row is simply not found. */
      it('will not delete another user’s weigh-in', async () => {
        const id = await createWeighIn('someone-else');

        const response = await request(app)
          .delete(`/weight_updates/${id}`)
          .query({ user_id: 'abc123' });

        expect(response.status).toBe(404);

        const history = await request(app)
          .get('/weight_updates/history')
          .query({ user_id: 'someone-else' });
        expect(history.body.data).toHaveLength(1);
      });

      it('rejects a malformed id rather than treating it as a miss', async () => {
        const response = await request(app)
          .delete('/weight_updates/not-an-object-id')
          .query({ user_id: 'abc123' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid id');
      });
    });

    it('does not leak another user when user_id is omitted', async () => {
      await request(app)
        .post('/weight_updates')
        .send({ weight_update: { user_id: 'abc123', date: '2024-08-10', weight: 77.4 } });

      const response = await request(app).get('/weight_updates/latest_weight');

      expect(response.body).toEqual({ success: false, error: 'No weight data found' });
    });
  });

  describe('POST /moods (§4.14)', () => {
    it('saves a mood and returns the success message', async () => {
      const response = await request(app)
        .post('/moods')
        .send({ mood_data: { user_id: 'abc123', mood: 'calm', date: '2024-08-25' } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Mood saved successfully' });

      const stored = await mongoose.connection.db!.collection('moods').findOne({});
      expect(stored).toMatchObject({ user_id: 'abc123', mood: 'calm' });
    });
  });

  describe('POST /user_data/preview (additive)', () => {
    /** `seedLifeExpectancy` puts ESP/Male at 83.2. */
    const healthy = {
      dob: '1990-05-10',
      gender: 'Male',
      height: 178,
      weight: 75,
      country: 'ESP',
      smoking_status: false,
      drinking_status: false,
      training_frequency: 3,
    };

    it('computes a figure without saving anything', async () => {
      await seedLifeExpectancy();
      const response = await request(app)
        .post('/user_data/preview')
        .send({ user_data: { ...healthy, user_id: 'abc123' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.adjusted_life_expectancy).toBeGreaterThan(0);
      expect(response.body.weeks_left_to_live).toBeGreaterThan(0);

      // The whole point: nothing persisted.
      const profile = await request(app)
        .get('/user_data/user_data')
        .query({ user_id: 'abc123' });
      expect(profile.body.success).toBe(false);
    });

    it('itemises every adjustment, including the ones that changed nothing', async () => {
      await seedLifeExpectancy();
      const response = await request(app)
        .post('/user_data/preview')
        .send({ user_data: healthy });

      expect(response.body.steps.map((s: { key: string }) => s.key)).toEqual([
        'smoking',
        'drinking',
        'bmi',
        'training',
      ]);
      // BMI 23.7 sits in the no-penalty band; 3 sessions a week is +6.
      expect(response.body.steps).toContainEqual({ key: 'bmi', years: 0 });
      expect(response.body.steps).toContainEqual({ key: 'training', years: 6 });
      expect(response.body.steps).toContainEqual({ key: 'smoking', years: 0 });
    });

    it('the itemised steps add up to the adjusted figure', async () => {
      await seedLifeExpectancy();
      const response = await request(app)
        .post('/user_data/preview')
        .send({ user_data: { ...healthy, smoking_status: true, drinking_status: true } });

      const total = response.body.steps.reduce(
        (sum: number, step: { years: number }) => sum + step.years,
        response.body.base_life_expectancy
      );
      expect(total).toBe(response.body.adjusted_life_expectancy);
    });

    it('answers success:false while the form is still incomplete', async () => {
      const response = await request(app)
        .post('/user_data/preview')
        .send({ user_data: { gender: 'male', country: 'ESP' } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, message: 'Not enough detail yet' });
    });
  });

  describe('GET /moods (additive)', () => {
    async function saveMood(user_id: string, mood: string, date: string) {
      await request(app).post('/moods').send({ mood_data: { user_id, mood, date } });
    }

    it('reads back what POST /moods wrote, newest first', async () => {
      await saveMood('abc123', 'calm', '2024-08-24');
      await saveMood('abc123', 'tired', '2024-08-26');
      await saveMood('abc123', 'strong', '2024-08-25');

      const response = await request(app).get('/moods').query({ user_id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: [
          { date: '2024-08-26', mood: 'tired' },
          { date: '2024-08-25', mood: 'strong' },
          { date: '2024-08-24', mood: 'calm' },
        ],
      });
    });

    it('scopes to the caller', async () => {
      await saveMood('abc123', 'calm', '2024-08-24');
      await saveMood('someone-else', 'tired', '2024-08-24');

      const response = await request(app).get('/moods').query({ user_id: 'abc123' });

      expect(response.body.data).toEqual([{ date: '2024-08-24', mood: 'calm' }]);
    });

    it('answers with an empty series rather than an error when nothing is logged', async () => {
      const response = await request(app).get('/moods').query({ user_id: 'abc123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: [] });
    });
  });

  describe('POST /generate_recommendation (§4.15)', () => {
    it('answers 400 when the user has no profile to build a prompt from', async () => {
      const response = await request(app)
        .post('/generate_recommendation')
        .send({ mood_data: { user_id: 'nobody', mood: 'calm', date: '2024-08-25' } });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ success: false, message: 'User data not found' });
    });

    /**
     * A `null` from the service — a missing API key, a non-200 from OpenAI, a timeout, or
     * a network error — must surface as the documented 422, never a 500.
     */
    it('answers 422 when the upstream call fails', async () => {
      await request(app).post('/user_data').send({ user_data: profile });
      queryChatGptMock.mockResolvedValue(null);

      const response = await request(app)
        .post('/generate_recommendation')
        .send({ mood_data: { user_id: 'abc123', mood: 'calm', date: '2024-08-25' } });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({ success: false, message: 'Failed to get recommendation' });
    });

    it('returns the recommendation and builds the §4.15 prompt from the profile', async () => {
      await seedLifeExpectancy();
      await request(app).post('/user_data').send({ user_data: profile });
      queryChatGptMock.mockResolvedValue('Take ten slow breaths.');

      const response = await request(app)
        .post('/generate_recommendation')
        .send({ mood_data: { user_id: 'abc123', mood: 'calm', date: '2024-08-25' } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, recommendation: 'Take ten slow breaths.' });

      const prompt = queryChatGptMock.mock.calls[0]![0];
      expect(prompt).toContain('The user is feeling calm today.');
      expect(prompt).toContain('living in ESP');
      expect(prompt).toContain('identify as Male');
      expect(prompt).toMatch(/They have approximately -?[\d.]+ weeks left to live\./);
      expect(prompt).toContain('maximum of 200 words altogether');
    });
  });
});
