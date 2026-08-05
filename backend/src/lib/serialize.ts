import { Types } from 'mongoose';

/**
 * Mongoid-compatible JSON serialisation (BACKEND_SPEC §6, "Mongoid JSON serialisation").
 *
 * The Rails backend rendered Mongoid documents directly, which produces a very specific
 * wire format that clients may already depend on:
 *
 *   - `_id` (and `inserted_id`) serialise as `{ "$oid": "<24-hex>" }`, NOT a bare string.
 *   - `Date` fields serialise as "YYYY-MM-DD".
 *   - `Time`/timestamp fields serialise as ISO-8601 UTC, e.g. "2024-06-14T12:02:57.000Z".
 *   - No root wrapping, no `_type` discriminator, no `__v`.
 *
 * `DATE_ONLY_FIELDS` lists the paths the Rails models declared as `Date` rather than
 * `Time`; everything else that holds a Date is a timestamp.
 */

const DATE_ONLY_FIELDS = new Set(['dob', 'date', 'first_login_date']);

export interface ObjectIdJson {
  $oid: string;
}

export function oid(id: Types.ObjectId | string): ObjectIdJson {
  return { $oid: id.toString() };
}

/**
 * `oid` for a freshly saved document. Mongoose types `_id` as `unknown` on schemas that
 * don't declare it explicitly, so this narrows in one place instead of at every call site.
 */
export function documentId(doc: { _id: unknown }): ObjectIdJson {
  return { $oid: String(doc._id) };
}

/** "YYYY-MM-DD" in UTC, matching Ruby's `Date#to_s`. */
export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** "2024-06-14T12:02:57.000Z", matching Mongoid's Time serialisation. */
export function toTimestamp(value: Date): string {
  return value.toISOString();
}

function serializeValue(key: string, value: unknown): unknown {
  if (value instanceof Types.ObjectId) return oid(value);
  if (value instanceof Date) {
    return DATE_ONLY_FIELDS.has(key) ? toDateOnly(value) : toTimestamp(value);
  }
  if (Array.isArray(value)) return value.map((item) => serializeValue(key, item));
  if (value !== null && typeof value === 'object') {
    return serializeDocument(value as Record<string, unknown>);
  }
  return value;
}

/**
 * Convert a lean Mongoose document into the Mongoid-shaped JSON described above.
 * Drops Mongoose's `__v`, which Mongoid never emitted.
 */
export function serializeDocument<T extends Record<string, unknown>>(
  doc: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === '__v') continue;
    if (value === undefined) continue;
    out[key] = serializeValue(key, value);
  }
  return out;
}

export function serializeDocuments<T extends Record<string, unknown>>(
  docs: T[]
): Record<string, unknown>[] {
  return docs.map((doc) => serializeDocument(doc));
}
