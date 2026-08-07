import type { Request } from 'express';
import { queryParam } from './params.js';

/**
 * Shared rules for the two catalogues.
 *
 * `training_repository` and `stretch_repository` behave identically and differ only in
 * their fields, so the ownership and discovery rules live here rather than being written
 * twice and drifting.
 *
 * ## The model
 *
 * Both catalogues used to be **global**: every entry was visible to everyone, and a list
 * endpoint took no user at all. That made a catalogue a shared noticeboard nobody owned —
 * junk accumulated permanently, and `POST /stretches` let any signed-in person put a video
 * in an iframe in everyone else's app.
 *
 * They are now **per-user with an explicit import path**. You see your own entries. You can
 * search everyone's entries deliberately, and copy one into your own catalogue, at which
 * point it is yours: a copy, not a reference, so the original author changing or removing
 * theirs does not reach into yours.
 */

/** Fields never sent to a client, on any catalogue response. */
const PRIVATE_FIELDS = ['created_by'] as const;

/**
 * Strips the owner uid, keeps the display name.
 *
 * `created_by` stays private — it identifies an account, and publishing it would let anyone
 * enumerate who exists. `created_by_name` is the deliberate exception: a browsable pool has
 * to say whose entry each one is, and a name describes a person without addressing them.
 */
export function withoutOwnerId(doc: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...doc };
  for (const field of PRIVATE_FIELDS) delete clone[field];
  return clone;
}

/**
 * The `?q=` term as a case-insensitive pattern, or null when the box is empty.
 *
 * Escaped before it reaches the RegExp: a search box is user input, and letting `.*` or a
 * nested quantifier through is how a search feature becomes a way to pin the database.
 *
 * Returns the pattern rather than a finished filter. Mongoose's inferred document generics
 * do not survive a `Record<string, unknown>` filter crossing a function boundary — the same
 * wall `ownedLookup` hit — so each controller assembles its own filter inline against its
 * own model, where it types cleanly.
 */
export function searchPattern(req: Request): RegExp | null {
  const term = queryParam(req.query['q'])?.trim();
  if (!term) return null;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}
