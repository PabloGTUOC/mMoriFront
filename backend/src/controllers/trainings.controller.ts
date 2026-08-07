import type { Request, Response } from 'express';
import { Training } from '../models/training.model.js';
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
  // `created_by` is stored for traceability but never returned — see the model.
  const { created_by: _createdBy, ...rest } = doc;
  return { ...rest, training_name: doc['name'] };
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

/** `GET /training-repository` — §4.8. Global catalogue, not user-scoped. */
export async function listTrainingRepository(_req: Request, res: Response): Promise<Response> {
  const entries = await TrainingRepository.find().sort({ created_at: 1, _id: 1 }).lean();

  if (entries.length === 0) {
    return failWithMessage(res, HTTP.ok, 'No training repository data found');
  }

  return ok(res, {
    success: true,
    data: serializeDocuments(entries).map(withTrainingNameAlias),
  });
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
