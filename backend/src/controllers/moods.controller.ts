import type { Request, Response } from 'express';
import { Mood } from '../models/mood.model.js';
import { UserData } from '../models/user-data.model.js';
import {
  adjustLifeExpectancy,
  calculateAge,
  fetchBaseLifeExpectancy,
  fetchLatestWeight,
  weeksLeftToLive,
} from '../services/life-methods.service.js';
import { buildPrompt, queryChatGpt } from '../services/openai.service.js';
import {
  failWithMessage,
  HTTP,
  isValidationError,
  ok,
  validationMessages,
} from '../lib/http.js';
import { isBlank, optionalWrapper, pick, toDateOrUndefined, toStringOrUndefined } from '../lib/params.js';

/**
 * `POST /moods` — BACKEND_SPEC §4.14.
 *
 * The wrapper key is `mood_data`, not `mood`, and Rails read it without strong parameters.
 * `ThoughtsComponent` already sends exactly this shape.
 *
 * DELIBERATE DEVIATION: §4.14 notes that omitting the `mood_data` key entirely raised a
 * `NoMethodError` and returned a **500**. That is a crash, not a contract, so a missing
 * wrapper falls through to the documented 400 "Missing parameters" instead.
 */
export async function saveMood(req: Request, res: Response): Promise<Response> {
  const params = optionalWrapper(req.body, 'mood_data', 'mood');

  const userId = toStringOrUndefined(pick(params, 'user_id'));
  const mood = toStringOrUndefined(pick(params, 'mood'));
  const date = toDateOrUndefined(pick(params, 'date'));

  if (isBlank(userId) || isBlank(mood) || !date) {
    return failWithMessage(res, HTTP.badRequest, 'Missing parameters');
  }

  try {
    await new Mood({ user_id: userId, mood, date }).save();
  } catch (error) {
    if (isValidationError(error)) {
      // Note: `message` holds an **array** on this branch, unlike the string above.
      return failWithMessage(res, HTTP.unprocessable, validationMessages(error));
    }
    throw error;
  }

  return ok(res, { success: true, message: 'Mood saved successfully' });
}

/**
 * `POST /generate_recommendation` — BACKEND_SPEC §4.15.
 *
 * The only endpoint with an external dependency. Pipeline, in order:
 *   1. newest `UserData` for the user (400 "User data not found" if absent)
 *   2. base life expectancy → latest weight → adjusted life expectancy
 *   3. age, then `weeks_left_to_live = (adjusted - age) * 52`
 *   4. blank-guard on mood/location/gender/age/weeks (400 "Missing parameters")
 *   5. OpenAI call; `null` from the service becomes 422 "Failed to get recommendation"
 *
 * `date` is accepted and unused, as in the original.
 */
export async function generateRecommendation(req: Request, res: Response): Promise<Response> {
  const params = optionalWrapper(req.body, 'mood_data', 'mood');

  const userId = toStringOrUndefined(pick(params, 'user_id'));
  const mood = toStringOrUndefined(pick(params, 'mood'));

  const userData = await UserData.findOne({ user_id: userId ?? null })
    .sort({ created_at: -1, _id: -1 })
    .lean();

  if (!userData) {
    return failWithMessage(res, HTTP.badRequest, 'User data not found');
  }

  const base = await fetchBaseLifeExpectancy(userData);
  const latestWeight = userId ? await fetchLatestWeight(userId) : null;
  const adjusted = adjustLifeExpectancy(base, userData, latestWeight);
  const age = userData.dob ? calculateAge(userData.dob) : null;
  const weeks = age === null ? null : weeksLeftToLive(adjusted, age);

  const location = userData.country;
  const gender = userData.gender;

  if (isBlank(mood) || isBlank(location) || isBlank(gender) || age === null || weeks === null) {
    return failWithMessage(res, HTTP.badRequest, 'Missing parameters');
  }

  const recommendation = await queryChatGpt(
    buildPrompt({
      mood: mood as string,
      age,
      location,
      gender,
      weeksLeftToLive: weeks,
    })
  );

  if (recommendation === null) {
    return failWithMessage(res, HTTP.unprocessable, 'Failed to get recommendation');
  }

  return ok(res, { success: true, recommendation });
}
