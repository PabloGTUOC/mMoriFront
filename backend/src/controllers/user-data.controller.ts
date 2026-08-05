import type { Request, Response } from 'express';
import { UserData } from '../models/user-data.model.js';
import {
  adjustLifeExpectancy,
  fetchBaseLifeExpectancy,
  fetchLatestWeight,
} from '../services/life-methods.service.js';
import {
  created,
  failWithErrors,
  failWithMessage,
  HTTP,
  isValidationError,
  ok,
  validationMessages,
} from '../lib/http.js';
import {
  pick,
  queryParam,
  requireWrapper,
  toBoolean,
  toDateOrUndefined,
  toIntegerOrUndefined,
  toNumberOrUndefined,
  toStringOrUndefined,
} from '../lib/params.js';
import { documentId, serializeDocument } from '../lib/serialize.js';
import { logger } from '../lib/logger.js';

/**
 * `POST /user_data` — BACKEND_SPEC §4.1.
 *
 * FRONTEND COMPATIBILITY. The spec permits `training_frequency`, `smoking_status`,
 * `drinking_status` and `country`. The Angular signup form (`FirstTimeComponent`) posts
 * `trainingFrequency`, `smoker`, `drinker` and `country_code` instead — so against the
 * Rails backend those four are dropped by strong parameters and the record fails its
 * presence validations with a 422. Both spellings are accepted here; the spec's names win
 * when both are present, and storage stays on the spec's field names.
 */
export async function createUserData(req: Request, res: Response): Promise<Response> {
  const params = requireWrapper(req.body, 'user_data');

  const document = new UserData({
    user_id: toStringOrUndefined(pick(params, 'user_id')),
    dob: toDateOrUndefined(pick(params, 'dob')),
    gender: toStringOrUndefined(pick(params, 'gender')),
    height: toNumberOrUndefined(pick(params, 'height')),
    weight: toNumberOrUndefined(pick(params, 'weight')),
    training_frequency: toIntegerOrUndefined(
      pick(params, 'training_frequency', 'trainingFrequency')
    ),
    smoking_status: toBoolean(pick(params, 'smoking_status', 'smoker'), false),
    drinking_status: toBoolean(pick(params, 'drinking_status', 'drinker'), false),
    country: toStringOrUndefined(pick(params, 'country', 'country_code')),
  });

  try {
    await document.save();
  } catch (error) {
    if (isValidationError(error)) {
      const errors = validationMessages(error);
      logger.error('Failed to save user data:', errors.join(', '));
      return failWithErrors(res, HTTP.unprocessable, errors);
    }
    throw error;
  }

  return created(res, { success: true, inserted_id: documentId(document) });
}

/**
 * `GET /user_data/user_data?user_id=<id>` — BACKEND_SPEC §4.2.
 *
 * The most important read endpoint: the dashboard's age, BMI and "weeks left" all derive
 * from it. Returns the **newest** profile snapshot plus base and adjusted life expectancy.
 *
 * Preserved quirks: a missing profile is a **200** with `success: false`, not a 404, and
 * there is no `user_id` presence check. The lookup coalesces a missing `user_id` to `null`
 * so that an omitted parameter matches nothing — Mongoose would otherwise strip an
 * `undefined` filter and return another user's document.
 */
export async function showUserData(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']) ?? null;

  const userData = await UserData.findOne({ user_id: userId })
    .sort({ created_at: -1, _id: -1 })
    .lean();

  if (!userData) {
    return failWithMessage(res, HTTP.ok, 'No data found');
  }

  const baseLifeExpectancy = await fetchBaseLifeExpectancy(userData);
  const latestWeight = userId ? await fetchLatestWeight(userId) : null;
  const adjustedLifeExpectancy = adjustLifeExpectancy(
    baseLifeExpectancy,
    userData,
    latestWeight
  );

  return ok(res, {
    success: true,
    user_data: serializeDocument(userData),
    base_life_expectancy: baseLifeExpectancy,
    adjusted_life_expectancy: adjustedLifeExpectancy,
  });
}
