import type { Request, Response } from 'express';
import { Training } from '../models/training.model.js';
import { ownedLookup } from '../lib/owned.js';
import { searchPattern, withoutOwnerId } from '../lib/catalogue.js';
import { TrainingRepository } from '../models/training-repository.model.js';
import { UserData } from '../models/user-data.model.js';
import {
  created,
  failWithError,
  failWithErrors,
  failWithMessage,
  HTTP,
  isValidationError,
  ok,
  validationMessages,
} from '../lib/http.js';
import {
  isBlank,
  optionalWrapper,
  pick,
  queryParam,
  requireWrapper,
  toIntegerOrUndefined,
  toStringOrUndefined,
} from '../lib/params.js';
import { documentId, serializeDocument, serializeDocuments, toDateOnly } from '../lib/serialize.js';

/**
 * Adds the `training_name` key the frontend reads.
 *
 * FRONTEND COMPATIBILITY. The spec's catalogue field is `name`, but both
 * `TrainingItemComponent` (`{{ training.training_name }}`) and the daily training picker
 * read `training_name`. The canonical field stays `name`; this mirrors it on the way out so
 * spec-conformant clients and the live frontend both find what they expect.
 */
function withTrainingNameAlias(doc: Record<string, unknown>): Record<string, unknown> {
  // The owner uid is stripped; the author's display name is not — see lib/catalogue.ts.
  return { ...withoutOwnerId(doc), training_name: doc['name'] };
}

/**
 * `POST /trainings` — BACKEND_SPEC §4.3. Logs one training session.
 *
 * FRONTEND COMPATIBILITY. The spec permits `training_date`, `training_type`, `duration`,
 * `calories_burned`, `description`. `InputDailyComponent` posts `{ user_id, date, training }`
 * — so against the Rails backend every meaningful field is dropped and the row saves with
 * nulls (there are no validations, §4.3 quirk). Accepting `date` → `training_date` and
 * `training` → `training_type` preserves what the user actually selected. Fields the
 * frontend never sends stay unset, exactly as today.
 */
export async function createTraining(req: Request, res: Response): Promise<Response> {
  const params = requireWrapper(req.body, 'training');

  const document = new Training({
    user_id: toStringOrUndefined(pick(params, 'user_id')),
    training_date: toStringOrUndefined(pick(params, 'training_date', 'date')),
    training_type: toStringOrUndefined(pick(params, 'training_type', 'training')),
    duration: toIntegerOrUndefined(pick(params, 'duration')),
    calories_burned: toIntegerOrUndefined(pick(params, 'calories_burned', 'calories')),
    description: toStringOrUndefined(pick(params, 'description')),
  });

  try {
    await document.save();
  } catch (error) {
    if (isValidationError(error)) {
      return failWithErrors(res, HTTP.unprocessable, validationMessages(error));
    }
    throw error;
  }

  return created(res, { success: true, inserted_id: documentId(document) });
}

/** `GET /trainings/latest-trainings` — §4.4. Singular `training` key; newest first. */
export async function latestTrainings(req: Request, res: Response): Promise<Response> {
  return findSingleTraining(req, res, -1);
}

/** `GET /trainings/initial-trainings` — §4.5. Identical but oldest first. */
export async function initialTrainings(req: Request, res: Response): Promise<Response> {
  return findSingleTraining(req, res, 1);
}

async function findSingleTraining(
  req: Request,
  res: Response,
  direction: 1 | -1
): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const training = await Training.findOne({ user_id: userId })
    .sort({ training_date: direction, _id: direction })
    .lean();

  if (!training) {
    return failWithError(res, HTTP.ok, 'No training data found');
  }

  return ok(res, { success: true, training: serializeDocument(training) });
}

/**
 * `GET /trainings/all-trainings` — §4.6.
 * Note the empty-result key is `message` here, where §4.4/§4.5 use `error`. Preserved.
 */
export async function allTrainings(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const trainings = await Training.find({ user_id: userId })
    .sort({ training_date: 1, _id: 1 })
    .lean();

  if (trainings.length === 0) {
    return failWithMessage(res, HTTP.ok, 'No data found');
  }

  return ok(res, { success: true, trainings: serializeDocuments(trainings) });
}

/**
 * `GET /trainings/training-stats` — §4.7. Drives the dashboard's "% days trained".
 *
 * Compares the user's **earliest** `UserData` document (their first login) against their
 * total training count. This is the only endpoint in the API that returns a genuine 404.
 */
export async function trainingStats(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const firstLogin = await UserData.findOne({ user_id: userId })
    .sort({ created_at: 1, _id: 1 })
    .lean();

  if (!firstLogin) {
    return failWithError(res, HTTP.notFound, 'No user data found');
  }

  const firstLoginDate = firstLogin.created_at ?? new Date();

  /*
   * Distinct dates, not row count.
   *
   * This was `countDocuments`, so it counted *sessions*. The frontend labels the figure
   * "Days trained" and divides it by the days since joining for "Training rate" — so two
   * sessions logged on one day counted as two days trained, and the rate could exceed
   * 100%. Training an afternoon as well as a morning is legitimate; claiming it was two
   * days is not.
   */
  const trainedDates = await Training.distinct('training_date', { user_id: userId });
  const trainingCount = trainedDates.filter((date) => typeof date === 'string' && date).length;

  return ok(res, {
    success: true,
    training_count: trainingCount,
    total_days_since_joining: daysSinceJoining(firstLoginDate, new Date()),
    first_login_date: toDateOnly(firstLoginDate),
  });
}

/**
 * `GET /training-repository` — §4.8, now **user-scoped**.
 *
 * The spec's catalogue was global: one list everyone saw and everyone wrote to. It is your
 * own list now, with `GET /training-repository/discover` as the deliberate way to reach
 * anyone else's. See lib/catalogue.ts for why.
 *
 * The empty-result envelope is unchanged — 200 with `success: false` and a `message` key —
 * because the frontend branches on it.
 */
export async function listTrainingRepository(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const entries = await TrainingRepository.find({ created_by: userId })
    .sort({ created_at: 1, _id: 1 })
    .lean();

  if (entries.length === 0) {
    return failWithMessage(res, HTTP.ok, 'No training repository data found');
  }

  return ok(res, {
    success: true,
    data: serializeDocuments(entries).map(withTrainingNameAlias),
  });
}

/**
 * `GET /training-repository/discover?q=` — **an addition.** Everyone else's entries.
 *
 * The pool a new user is shown at signup, and what the "Search other users" control reads
 * afterwards. Always someone else's: your own are on your own screen, and listing them here
 * would invite importing a second copy of what you already have.
 */
export async function discoverTrainingRepository(
  req: Request,
  res: Response
): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const pattern = searchPattern(req);
  const entries = await TrainingRepository.find({
    created_by: { $ne: userId },
    ...(pattern
      ? { $or: [{ name: pattern }, { type: pattern }, { description: pattern }] }
      : {}),
  })
    .sort({ created_at: -1, _id: -1 })
    .limit(100)
    .lean();

  return ok(res, {
    success: true,
    data: serializeDocuments(entries).map(withTrainingNameAlias),
  });
}

/**
 * `POST /training-repository/:id/import` — **an addition.**
 *
 * Copies someone else's entry into your catalogue. A copy, not a reference: once imported
 * it is yours, and the original author editing or deleting theirs cannot reach into it.
 *
 * Importing the same entry twice is a no-op rather than an error. The button is in a
 * browsable list, so pressing it again is a slip, not a request for a duplicate.
 */
export async function importTrainingRepositoryEntry(
  req: Request,
  res: Response
): Promise<Response> {
  const lookup = ownedLookup(req);
  if (!lookup.ok) return failWithError(res, HTTP.badRequest, lookup.error);

  const source = await TrainingRepository.findById(lookup.id).lean();
  if (!source) return failWithError(res, HTTP.notFound, 'Not found');

  const existing = await TrainingRepository.findOne({
    created_by: lookup.userId,
    name: source.name,
  }).lean();

  if (existing) {
    return ok(res, {
      success: true,
      data: [withTrainingNameAlias(serializeDocument(existing))],
    });
  }

  const copy = new TrainingRepository({
    name: source.name,
    type: source.type,
    duration: source.duration,
    calories: source.calories,
    description: source.description,
    created_by: lookup.userId,
    created_by_name: req.auth?.name,
  });

  await copy.save();

  return created(res, {
    success: true,
    data: [withTrainingNameAlias(serializeDocument(copy.toObject()))],
  });
}

/** `DELETE /training-repository/:id` — **an addition.** Removes one of your own entries. */
export async function deleteTrainingRepositoryEntry(
  req: Request,
  res: Response
): Promise<Response> {
  const lookup = ownedLookup(req);
  if (!lookup.ok) return failWithError(res, HTTP.badRequest, lookup.error);

  const deleted = await TrainingRepository.findOneAndDelete({
    _id: lookup.id,
    created_by: lookup.userId,
  }).lean();

  if (!deleted) return failWithError(res, HTTP.notFound, 'Not found');
  return ok(res, { success: true });
}

/**
 * `POST /training-repository` — §4.9.
 *
 * The wrapper key is `training`, **not** `training_repository` — a genuine trap the spec
 * calls out. `training_repository` and an unwrapped body are accepted too, since only the
 * wrapper name differs. `training_name` is accepted as an alias for `name`, which is what
 * the frontend's add-training form actually submits.
 *
 * The response wraps the single created document in an array, for symmetry with the index
 * response. Preserved.
 */
export async function createTrainingRepositoryEntry(
  req: Request,
  res: Response
): Promise<Response> {
  const params = optionalWrapper(req.body, 'training', 'training_repository');

  const document = new TrainingRepository({
    name: toStringOrUndefined(pick(params, 'name', 'training_name')),
    type: toStringOrUndefined(pick(params, 'type')),
    duration: toIntegerOrUndefined(pick(params, 'duration')),
    calories: toIntegerOrUndefined(pick(params, 'calories', 'calories_burned')),
    description: toStringOrUndefined(pick(params, 'description')),
    created_by: req.auth?.uid,
    created_by_name: req.auth?.name,
  });

  try {
    await document.save();
  } catch (error) {
    if (isValidationError(error)) {
      return failWithErrors(res, HTTP.unprocessable, validationMessages(error));
    }
    throw error;
  }

  return created(res, {
    success: true,
    data: [withTrainingNameAlias(serializeDocument(document.toObject()))],
  });
}

/**
 * `DELETE /trainings/:id` — **an addition to the spec.**
 *
 * Nothing in this API could be undone: no PATCH, no DELETE, on any of the sixteen routes.
 * A session logged by mistake was permanent, and since `training_count` feeds the dashboard
 * it also permanently skewed the only progress figure the app shows.
 *
 * The filter carries `user_id` as well as `_id`, so ownership is enforced by the query
 * rather than by a check that could be forgotten. `requireAuth` has already replaced that
 * value with the verified uid. A row belonging to someone else is indistinguishable from
 * one that does not exist, which is the correct answer to both.
 */
export async function deleteTraining(req: Request, res: Response): Promise<Response> {
  const lookup = ownedLookup(req);
  if (!lookup.ok) return failWithError(res, HTTP.badRequest, lookup.error);

  const deleted = await Training.findOneAndDelete({
    _id: lookup.id,
    user_id: lookup.userId,
  }).lean();

  if (!deleted) return failWithError(res, HTTP.notFound, 'Not found');
  return ok(res, { success: true });
}

/**
 * Days elapsed since joining, **counting the join day itself**.
 *
 * This used to be the bare difference, matching Ruby's `(Date.today - date).to_i`, which
 * is 0 on the day you sign up. The frontend divides by it, so a user who signed up and
 * trained on the same day saw "Training rate 0%" — the denominator said no days had
 * happened yet. One day has happened: today. A deviation from BACKEND_SPEC, recorded in
 * backend/README.md alongside the BMI band fix.
 */
function daysSinceJoining(from: Date, to: Date): number {
  const startOfDay = (value: Date) =>
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return Math.floor((startOfDay(to) - startOfDay(from)) / 86_400_000) + 1;
}
