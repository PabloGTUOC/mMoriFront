import type { Request, Response } from 'express';
import { StretchRepository } from '../models/stretch-repository.model.js';
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
  optionalWrapper,
  pick,
  queryParam,
  toIntegerOrUndefined,
  toStringOrUndefined,
} from '../lib/params.js';
import { ownedLookup } from '../lib/owned.js';
import { searchPattern, withoutOwnerId } from '../lib/catalogue.js';
import { serializeDocument, serializeDocuments } from '../lib/serialize.js';
import { isValidYouTubeUrl } from '../lib/youtube.js';

/**
 * Adds the `stretch_name` key the frontend reads.
 *
 * FRONTEND COMPATIBILITY. The spec's field is `name`; `StretchItemComponent` renders
 * `{{ stretch.stretch_name }}`. Canonical storage stays `name`, mirrored on output.
 */
function withStretchNameAlias(doc: Record<string, unknown>): Record<string, unknown> {
  // The owner uid is stripped; the author's display name is not — see lib/catalogue.ts.
  return { ...withoutOwnerId(doc), stretch_name: doc['name'] };
}

/**
 * `GET /stretches` — BACKEND_SPEC §4.10.
 * Always 200 with `success: true`, even when the catalogue is empty (`data: []`).
 * Note this differs from `GET /training-repository`, which reports an empty catalogue as
 * `success: false`. Both are preserved as-is.
 */
export async function listStretches(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const stretches = await StretchRepository.find({ created_by: userId })
    .sort({ created_at: 1, _id: 1 })
    .lean();

  return ok(res, {
    success: true,
    data: serializeDocuments(stretches).map(withStretchNameAlias),
  });
}

/**
 * `GET /stretches/discover?q=` — **an addition.** Everyone else's stretches.
 *
 * This is the catalogue that carries a video rendered in an iframe, so scoping mattered
 * most here: a global write surface meant any signed-in person could put a video in
 * everyone's app. Reaching someone else's entry is now a deliberate act, and importing it
 * is a second one.
 */
export async function discoverStretches(req: Request, res: Response): Promise<Response> {
  const userId = queryParam(req.query['user_id']);
  if (isBlank(userId)) {
    return failWithError(res, HTTP.badRequest, 'UserId is missing');
  }

  const pattern = searchPattern(req);
  const stretches = await StretchRepository.find({
    created_by: { $ne: userId },
    ...(pattern ? { $or: [{ name: pattern }, { description: pattern }] } : {}),
  })
    .sort({ created_at: -1, _id: -1 })
    .limit(100)
    .lean();

  return ok(res, {
    success: true,
    data: serializeDocuments(stretches).map(withStretchNameAlias),
  });
}

/**
 * `POST /stretches/:id/import` — **an addition.** Copies an entry into your catalogue.
 *
 * A copy, not a reference: the original author editing or removing theirs cannot reach into
 * yours. Importing twice is a no-op, since the button sits in a browsable list and pressing
 * it again is a slip rather than a request for a duplicate.
 */
export async function importStretch(req: Request, res: Response): Promise<Response> {
  const lookup = ownedLookup(req);
  if (!lookup.ok) return failWithError(res, HTTP.badRequest, lookup.error);

  const source = await StretchRepository.findById(lookup.id).lean();
  if (!source) return failWithError(res, HTTP.notFound, 'Not found');

  const existing = await StretchRepository.findOne({
    created_by: lookup.userId,
    name: source.name,
  }).lean();

  if (existing) {
    return ok(res, {
      success: true,
      data: [withStretchNameAlias(serializeDocument(existing))],
    });
  }

  const copy = new StretchRepository({
    name: source.name,
    type: source.type,
    duration: source.duration,
    description: source.description,
    video_link: source.video_link,
    created_by: lookup.userId,
    created_by_name: req.auth?.name,
  });

  await copy.save();

  return created(res, {
    success: true,
    data: [withStretchNameAlias(serializeDocument(copy.toObject()))],
  });
}

/** `DELETE /stretches/:id` — **an addition.** Removes one of your own entries. */
export async function deleteStretch(req: Request, res: Response): Promise<Response> {
  const lookup = ownedLookup(req);
  if (!lookup.ok) return failWithError(res, HTTP.badRequest, lookup.error);

  const deleted = await StretchRepository.findOneAndDelete({
    _id: lookup.id,
    created_by: lookup.userId,
  }).lean();

  if (!deleted) return failWithError(res, HTTP.notFound, 'Not found');
  return ok(res, { success: true });
}

/**
 * `POST /stretches` — BACKEND_SPEC §4.11.
 *
 * Preserved quirk: this create returns **200, not 201**, unlike every other create
 * endpoint, and its failure branch also returns 200.
 *
 * FRONTEND COMPATIBILITY, two deviations:
 *   - The spec requires a `stretch` wrapper; `StretchRepositoryComponent` posts the bare
 *     form value, which Rails answers with a 400. The wrapper is optional here.
 *   - The form sends `stretch_name` and `video_link`. The spec permits neither
 *     (`name, type, duration, description`), so the link was dropped on write and the
 *     frontend's embedded YouTube player rendered blank. `stretch_name` maps to `name` and
 *     `video_link` is persisted — see the model for why that field is additive.
 */
export async function createStretch(req: Request, res: Response): Promise<Response> {
  const params = optionalWrapper(req.body, 'stretch', 'stretch_repository');

  /**
   * The catalogue is shared, so a link saved here is framed for every user. Validate on the
   * server too — a browser-side check is a UX affordance, not a control, since anyone can
   * POST directly. Uses this endpoint's documented failure shape (200 with success:false),
   * not a 422, because that is the convention callers already branch on (§4.11).
   */
  const videoLink = toStringOrUndefined(pick(params, 'video_link'));
  if (videoLink && !isValidYouTubeUrl(videoLink)) {
    return failWithErrors(res, HTTP.ok, ['Video link must be a YouTube URL']);
  }

  const document = new StretchRepository({
    name: toStringOrUndefined(pick(params, 'name', 'stretch_name')),
    type: toStringOrUndefined(pick(params, 'type')),
    duration: toIntegerOrUndefined(pick(params, 'duration')),
    description: toStringOrUndefined(pick(params, 'description')),
    video_link: videoLink,
    created_by: req.auth?.uid,
    created_by_name: req.auth?.name,
  });

  try {
    await document.save();
  } catch (error) {
    if (isValidationError(error)) {
      // 200, not 422 — the original set no status on this branch.
      return failWithErrors(res, HTTP.ok, validationMessages(error));
    }
    throw error;
  }

  return ok(res, {
    success: true,
    data: [withStretchNameAlias(serializeDocument(document.toObject()))],
  });
}
