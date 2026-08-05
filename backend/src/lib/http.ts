import type { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

/**
 * Response helpers for the `{ success: true|false, ... }` envelope (BACKEND_SPEC §6).
 *
 * The original API is inconsistent about which key carries a failure message — some
 * endpoints use `error`, others `message` — and about status codes (a "not found" is
 * usually 200, except `training-stats` which is a real 404). Those inconsistencies are
 * reproduced faithfully at each call site rather than smoothed over here, because clients
 * branch on the exact key.
 */

export const HTTP = {
  ok: 200,
  created: 201,
  badRequest: 400,
  notFound: 404,
  unprocessable: 422,
  serverError: 500,
} as const;

export function ok(res: Response, payload: Record<string, unknown>): Response {
  return res.status(HTTP.ok).json(payload);
}

export function created(res: Response, payload: Record<string, unknown>): Response {
  return res.status(HTTP.created).json(payload);
}

/** `{ success: false, error: ... }` — the key used by the trainings and weight reads. */
export function failWithError(
  res: Response,
  status: number,
  error: string
): Response {
  return res.status(status).json({ success: false, error });
}

/** `{ success: false, message: ... }` — the key used by user_data, moods and the catalogues. */
export function failWithMessage(
  res: Response,
  status: number,
  message: string | string[]
): Response {
  return res.status(status).json({ success: false, message });
}

/** `{ success: false, errors: [...] }` — the validation-failure shape. */
export function failWithErrors(
  res: Response,
  status: number,
  errors: string[]
): Response {
  return res.status(status).json({ success: false, errors });
}

/**
 * Flattens a Mongoose ValidationError into the array of human-readable strings that Rails
 * produced via `record.errors.full_messages` (e.g. "User can't be blank").
 */
export function validationMessages(error: unknown): string[] {
  if (error instanceof MongooseError.ValidationError) {
    return Object.values(error.errors).map((detail) => detail.message);
  }
  if (error instanceof Error) return [error.message];
  return ['Unknown validation error'];
}

export function isValidationError(error: unknown): boolean {
  return error instanceof MongooseError.ValidationError;
}
