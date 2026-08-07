import type { Request, Response } from 'express';
import { WeightUpdate } from '../models/weight-update.model.js';
import {
  created,
  failWithError,
  failWithErrors,
  HTTP,
  isValidationError,
  ok,
  validationMessages,
} from '../lib/http.js';
import {
  isBlank,
  pick,
  queryParam,
  toDateOrUndefined,
  toNumberOrUndefined,
  toStringOrUndefined,
} from '../lib/params.js';
import { documentId, oid, toDateOnly } from '../lib/serialize.js';
import { ownedLookup } from '../lib/owned.js';
import { logger } from '../lib/logger.js';

/**
 * `POST /weight_updates` — BACKEND_SPEC §4.12.
 *
 * The guard checks the wrapper and `user_id` together and answers 400 "UserId is missing"
 * for either, which is what the Rails `before_action` did. This endpoint's wrapper and
 * field names already match what `UserDataService.submitWeightUpdate` sends.
 */
export async function createWeightUpdate(req: Request, res: Response): Promise<Response> {
  const body = req.body as Record<string, unknown> | undefined;
  const params = (body?.['weight_update'] ?? null) as Record<string, unknown> | null;

  if (!params || isBlank(params['user_id'])) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const userId = toStringOrUndefined(pick(params, 'user_id'));
  const weight = toNumberOrUndefined(pick(params, 'weight'));
  const date = toDateOrUndefined(pick(params, 'date'));

  /*
   * One weigh-in per day: a second reading on the same date replaces the first.
   *
   * Appending meant the daily form, submitted twice, wrote two rows for one day. The
   * history chart then drew two points at the same x, which reads as a vertical jump, and
   * a typo could never be corrected — there is no PATCH or DELETE anywhere in this API.
   * Re-weighing yourself and replacing the earlier figure is what a user expects; keeping
   * both is not.
   */
  const existing =
    userId && date ? await WeightUpdate.findOne({ user_id: userId, date }) : null;

  const document = existing ?? new WeightUpdate({ user_id: userId, date });
  document.weight = weight as number;

  try {
    await document.save();
  } catch (error) {
    if (isValidationError(error)) {
      const errors = validationMessages(error);
      logger.error('Failed to save weight update:', errors.join(', '));
      return failWithErrors(res, HTTP.unprocessable, errors);
    }
    throw error;
  }

  return created(res, { success: true, inserted_id: documentId(document) });
}

/**
 * `GET /weight_updates/latest_weight?user_id=<id>` — BACKEND_SPEC §4.13.
 *
 * Ordered `date desc, _id desc`; the `_id` tiebreaker makes same-day entries deterministic.
 * Per the spec there is **no `user_id` presence check** on this action (the guard was
 * `only: [:create]`), so the behaviour is preserved — but a missing `user_id` is coalesced
 * to `null` rather than left undefined, so it matches nothing instead of returning an
 * arbitrary user's weigh-in.
 */
export async function latestWeight(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']) ?? null;

  const latest = await WeightUpdate.findOne({ user_id: userId })
    .sort({ date: -1, _id: -1 })
    .lean();

  if (!latest) {
    return failWithError(res, HTTP.ok, 'No weight data found');
  }

  return ok(res, {
    success: true,
    weight: latest.weight,
    date: latest.date ? toDateOnly(latest.date) : null,
  });
}

/**
 * `GET /weight_updates/history?user_id=<id>` — the full weigh-in series, oldest first.
 *
 * Not in BACKEND_SPEC: the original API only ever exposed `latest_weight`, which is why the
 * frontend shipped a complete weight-history chart that could never be rendered
 * (FRONTEND_IMPROVEMENT_PLAN.md 6.3). Additive, so no existing client is affected.
 */
export async function weightHistory(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']) ?? null;

  const updates = await WeightUpdate.find({ user_id: userId })
    .sort({ date: 1, _id: 1 })
    .lean();

  return ok(res, {
    success: true,
    // `_id` is included so a weigh-in can be deleted from the history screen. Without an
    // identifier the series is readable but not correctable, which is how a stray point
    // ended up distorting the chart with no way to remove it.
    data: updates
      .filter((update) => update.date && typeof update.weight === 'number')
      .map((update) => ({
        _id: oid(update._id),
        date: toDateOnly(update.date as Date),
        weight: update.weight,
      })),
  });
}

/**
 * `DELETE /weight_updates/:id` — **an addition to the spec.**
 *
 * Same-day submissions replace each other, so a figure typed for *today* can be corrected
 * by re-entering it. That does nothing for a weigh-in filed against the wrong date, or one
 * logged for a day you would rather drop — and a stray point distorts the history chart for
 * as long as it exists. Ownership is enforced in the filter; see lib/owned.ts.
 */
export async function deleteWeightUpdate(req: Request, res: Response): Promise<Response> {
  const lookup = ownedLookup(req);
  if (!lookup.ok) return failWithError(res, HTTP.badRequest, lookup.error);

  const deleted = await WeightUpdate.findOneAndDelete({
    _id: lookup.id,
    user_id: lookup.userId,
  }).lean();

  if (!deleted) return failWithError(res, HTTP.notFound, 'Not found');
  return ok(res, { success: true });
}
