import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { firebaseAuth } from '../config/firebase.js';
import { logger } from '../lib/logger.js';

/**
 * Verifies the Firebase ID token and makes the verified uid the only source of identity.
 *
 * BACKEND_SPEC §9.3: every endpoint identified the caller by a `user_id` string in the
 * query or body, trusted verbatim, so anyone could read or write any user's data by
 * guessing a uid. This middleware closes that.
 *
 * The key move is that it **overwrites `user_id` with the verified uid** rather than
 * leaving controllers to remember to use `req.auth`. No controller changes, and no route
 * can accidentally keep trusting the client. A body that disagrees with the token is a 403
 * — a mismatch is either a bug or an attempt, and both deserve to be loud.
 *
 * ## AUTH_MODE — the staged rollout
 *
 * Enforcement cannot land in one commit: the moment the server requires a token, any client
 * not yet sending one breaks. See FRONTEND_IMPROVEMENT_PLAN.md §4.4.
 *
 *   disabled — no verification; an unnamed caller becomes DEV_USER_ID (local single-user)
 *   optional — verify when a token is present, log when it is not, never reject  ← default
 *   required — reject anything unauthenticated with 401
 */
export interface AuthContext {
  uid: string;
  email?: string;
  /**
   * A name to attribute shared work to.
   *
   * Catalogue entries are per-user and importable from other people, so a browsable pool
   * has to say whose entry each one is. The uid cannot do that job — it identifies an
   * account rather than describing a person, and publishing it is exactly the leak the
   * `created_by`-is-never-returned rule exists to avoid.
   *
   * Falls back to the local part of the email, then to nothing. Never the uid.
   */
  name?: string;
}

/** Firebase's `name` claim if the account has a display name, else the email's local part. */
export function displayNameFrom(claims: { name?: unknown; email?: string }): string | undefined {
  if (typeof claims.name === 'string' && claims.name.trim()) return claims.name.trim();
  if (claims.email) return claims.email.split('@')[0];
  return undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** Where a user_id may hide in a request body, per the spec's wrapper keys (§6). */
const BODY_WRAPPERS = ['user_data', 'training', 'weight_update', 'mood_data', 'mood'];

function claimedUserId(req: Request): string | undefined {
  const fromQuery = req.query['user_id'];
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;

  const body = req.body as Record<string, unknown> | undefined;
  if (!body) return undefined;

  for (const wrapper of BODY_WRAPPERS) {
    const nested = body[wrapper] as Record<string, unknown> | undefined;
    if (nested && typeof nested['user_id'] === 'string' && nested['user_id']) {
      return nested['user_id'] as string;
    }
  }
  return typeof body['user_id'] === 'string' ? (body['user_id'] as string) : undefined;
}

/** Rewrites every place a user_id can appear so controllers read the verified value. */
function applyVerifiedUserId(req: Request, uid: string): void {
  // Express 5 exposes `query` through a getter, so it has to be redefined rather than assigned.
  const query = { ...req.query, user_id: uid };
  Object.defineProperty(req, 'query', { value: query, configurable: true, writable: true });

  const body = req.body as Record<string, unknown> | undefined;
  if (!body) return;

  for (const wrapper of BODY_WRAPPERS) {
    const nested = body[wrapper] as Record<string, unknown> | undefined;
    if (nested && typeof nested === 'object') nested['user_id'] = uid;
  }
  if ('user_id' in body) body['user_id'] = uid;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (env.authMode === 'disabled') {
    /*
     * No verification. A request that names a user is trusted, which is the pre-Phase-4
     * behaviour; one that does not — every request the current frontend makes — gets a
     * fixed local identity, so the app is usable without Firebase credentials.
     *
     * `req.auth` is populated either way. It used to be left undefined whenever a request
     * named a user, so `created_by: req.auth?.uid` silently stored nothing. That was
     * invisible while catalogues were global and every entry was visible to everyone; now
     * that ownership decides who sees an entry, an unset owner means an entry nobody owns.
     */
    const claimed = claimedUserId(req);
    if (claimed) {
      req.auth = { uid: claimed, name: claimed };
    } else {
      req.auth = { uid: env.devUserId, name: env.devUserId };
      applyVerifiedUserId(req, env.devUserId);
    }
    next();
    return;
  }

  const token = bearerToken(req);

  if (!token) {
    if (env.authMode === 'optional') {
      logger.warn(`Unauthenticated request to ${req.method} ${req.path} (AUTH_MODE=optional)`);
      next();
      return;
    }
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const auth = firebaseAuth();
  if (!auth) {
    // Credentials missing. Failing open in `required` mode would defeat the point.
    if (env.authMode === 'required') {
      res.status(500).json({ success: false, error: 'Authentication is not configured' });
      return;
    }
    next();
    return;
  }

  try {
    const decoded = await auth.verifyIdToken(token, env.checkRevoked);
    req.auth = { uid: decoded.uid, email: decoded.email };

    const claimed = claimedUserId(req);
    if (claimed && claimed !== decoded.uid) {
      logger.warn(`Rejected request claiming user_id ${claimed} with token for ${decoded.uid}`);
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    applyVerifiedUserId(req, decoded.uid);
    next();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(`Token verification failed: ${reason}`);

    if (env.authMode === 'optional') {
      next();
      return;
    }
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}
