/**
 * Request-parameter helpers.
 *
 * Two jobs here:
 *
 * 1. Reproduce Rails' strong-parameter *wrapper* convention (BACKEND_SPEC §6, "Parameter
 *    wrapper names") — `POST /trainings` expects `{ "training": { ... } }`, `POST /moods`
 *    expects `{ "mood_data": { ... } }`, and so on. A missing wrapper is a 400 in Rails.
 *
 * 2. Bridge the field-name drift between the spec and what the Angular frontend actually
 *    sends. The two disagree in several places (documented per-controller); rather than
 *    change the frontend or break the documented contract, every affected endpoint accepts
 *    both names. Responses carry both too, so old and new clients each find what they read.
 */

export type Params = Record<string, unknown>;

export class ParameterMissingError extends Error {
  constructor(public readonly wrapper: string) {
    super(`param is missing or the value is empty: ${wrapper}`);
    this.name = 'ParameterMissingError';
  }
}

function isPlainObject(value: unknown): value is Params {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Rails' `params.require(:wrapper)`. Throws `ParameterMissingError` when the wrapper key
 * is absent, which the error middleware turns into a 400.
 */
export function requireWrapper(body: unknown, wrapper: string): Params {
  if (isPlainObject(body) && isPlainObject(body[wrapper])) {
    return body[wrapper] as Params;
  }
  throw new ParameterMissingError(wrapper);
}

/**
 * Like `requireWrapper`, but falls back to the body itself when no wrapper is present.
 *
 * Needed because the frontend posts some payloads unwrapped — `StretchRepositoryComponent`
 * sends the bare form value where the spec requires a `stretch` wrapper. Accepting both
 * keeps the documented contract working without a 400 for the live client.
 */
export function optionalWrapper(body: unknown, ...wrappers: string[]): Params {
  if (!isPlainObject(body)) return {};
  for (const wrapper of wrappers) {
    if (isPlainObject(body[wrapper])) return body[wrapper] as Params;
  }
  return body;
}

/** First defined, non-empty value among `keys`. Used for field-name aliases. */
export function pick(params: Params, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** Rails' `.blank?` — nil, empty string, whitespace-only, or empty collection. */
export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function toStringOrUndefined(value: unknown): string | undefined {
  if (isBlank(value)) return undefined;
  return String(value).trim();
}

/** Coerces "78" and 78 alike; the frontend sends some numerics as strings. */
export function toNumberOrUndefined(value: unknown): number | undefined {
  if (isBlank(value)) return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toIntegerOrUndefined(value: unknown): number | undefined {
  const parsed = toNumberOrUndefined(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

/**
 * Accepts `true`/`false`, `"true"`/`"false"`, `1`/`0`, `"1"`/`"0"`, `"on"`.
 * The signup form binds these to Material checkboxes, which emit real booleans, but the
 * spec's Rails params could arrive as strings.
 */
export function toBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

/**
 * Parses "YYYY-MM-DD" (and full ISO strings) into a UTC-midnight Date, so a date never
 * shifts a day when it round-trips through `toDateOnly`.
 */
export function toDateOrUndefined(value: unknown): Date | undefined {
  if (isBlank(value)) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;

  const raw = String(value).trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
}

/** Reads a query-string scalar, ignoring array/object forms Express may produce. */
export function queryParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}
