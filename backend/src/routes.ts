import { Router } from 'express';
import mongoose from 'mongoose';
import { createUserData, showUserData } from './controllers/user-data.controller.js';
import {
  allTrainings,
  createTraining,
  createTrainingRepositoryEntry,
  initialTrainings,
  latestTrainings,
  listTrainingRepository,
  trainingStats,
} from './controllers/trainings.controller.js';
import { createWeightUpdate, latestWeight } from './controllers/weight-updates.controller.js';
import { createStretch, listStretches } from './controllers/stretches.controller.js';
import { generateRecommendation, saveMood } from './controllers/moods.controller.js';
import { requireAuth } from './middleware/require-auth.js';

/**
 * All 16 routes from BACKEND_SPEC §4, at their exact paths.
 *
 * The awkward ones are deliberate and must not be "tidied":
 *   - `/user_data/user_data` is the real read path — `/user_data` is the create.
 *   - the `/trainings/*` collection paths are hyphenated, while `/weight_updates/latest_weight`
 *     is underscored.
 * The Angular services call these literal strings; renaming any of them breaks the app.
 */

export const router: Router = Router();

/** Rails' built-in health endpoint. Reports the Mongo connection state too. */
router.get('/up', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
  });
});

/**
 * Everything below the health check requires a verified Firebase ID token, and reads its
 * identity from that token rather than from the request. The catalogue routes are included
 * deliberately: `POST /stretches` accepts a URL that the frontend renders in an iframe for
 * every user, so unauthenticated write access to it was the most exploitable surface in the
 * app. How strictly this is enforced depends on AUTH_MODE — see require-auth.ts.
 */
router.use(requireAuth);

// User data
router.post('/user_data', createUserData);
router.get('/user_data/user_data', showUserData);

// Training sessions
router.post('/trainings', createTraining);
router.get('/trainings/latest-trainings', latestTrainings);
router.get('/trainings/initial-trainings', initialTrainings);
router.get('/trainings/all-trainings', allTrainings);
router.get('/trainings/training-stats', trainingStats);

// Training catalogue
router.get('/training-repository', listTrainingRepository);
router.post('/training-repository', createTrainingRepositoryEntry);

// Weight
router.post('/weight_updates', createWeightUpdate);
router.get('/weight_updates/latest_weight', latestWeight);

// Stretch catalogue
router.get('/stretches', listStretches);
router.post('/stretches', createStretch);

// Mood + AI recommendation
router.post('/moods', saveMood);
router.post('/generate_recommendation', generateRecommendation);
