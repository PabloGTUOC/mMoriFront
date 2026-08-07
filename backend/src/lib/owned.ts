import type { Request } from 'express';
import mongoose from 'mongoose';
import { isBlank, queryParam } from './params.js';

export type OwnedLookup =
  | { ok: true; userId: string; id: string }
  | { ok: false; error: string };

/**
 * Validates a delete-by-id request: a caller identity and a well-formed object id.
 *
 * This deliberately stops short of running the delete. Passing the model, or the removal
 * itself, through a shared helper means threading Mongoose's inferred document generics
 * across a function boundary, and they do not survive it — `FilterQuery` wants an index
 * signature whose value union then rejects `ObjectId`. Built inline against a concrete
 * model the filter types cleanly, so each controller spends three lines and keeps full
 * inference.
 *
 * What must not vary between callers is that `user_id` is part of the **filter** rather
 * than a check afterwards — a check can be forgotten in a new caller — and that a row owned
 * by someone else answers exactly as a missing one does. Distinguishing them would confirm
 * the existence of other users' rows to anyone who could guess an id.
 *
 * `requireAuth` has already rewritten `user_id` to the verified uid before any controller
 * sees the request.
 */
export function ownedLookup(req: Request): OwnedLookup {
  const userId = queryParam(req.query['user_id']);
  if (!userId || isBlank(userId)) {
    return { ok: false, error: 'UserId is missing' };
  }

  // Express 5 types a route param as `string | string[]`.
  const raw = req.params['id'];
  const id = typeof raw === 'string' ? raw : undefined;
  if (!id || !mongoose.isValidObjectId(id)) {
    return { ok: false, error: 'Invalid id' };
  }

  return { ok: true, userId, id };
}
