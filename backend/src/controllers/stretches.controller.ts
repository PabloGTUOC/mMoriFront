import type { Request, Response } from 'express';
import { StretchRepository } from '../models/stretch-repository.model.js';
import { failWithErrors, HTTP, isValidationError, ok, validationMessages } from '../lib/http.js';
import { optionalWrapper, pick, toIntegerOrUndefined, toStringOrUndefined } from '../lib/params.js';
import { serializeDocument, serializeDocuments } from '../lib/serialize.js';
import { isValidYouTubeUrl } from '../lib/youtube.js';

/**
 * Adds the `stretch_name` key the frontend reads.
 *
 * FRONTEND COMPATIBILITY. The spec's field is `name`; `StretchItemComponent` renders
 * `{{ stretch.stretch_name }}`. Canonical storage stays `name`, mirrored on output.
 */
function withStretchNameAlias(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, stretch_name: doc['name'] };
}

/**
 * `GET /stretches` — BACKEND_SPEC §4.10.
 * Always 200 with `success: true`, even when the catalogue is empty (`data: []`).
 * Note this differs from `GET /training-repository`, which reports an empty catalogue as
 * `success: false`. Both are preserved as-is.
 */
export async function listStretches(_req: Request, res: Response): Promise<Response> {
  const stretches = await StretchRepository.find().sort({ created_at: 1, _id: 1 }).lean();

  return ok(res, {
    success: true,
    data: serializeDocuments(stretches).map(withStretchNameAlias),
  });
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
