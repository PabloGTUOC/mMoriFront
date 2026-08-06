import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

/**
 * Fixed-window rate limiter (FRONTEND_IMPROVEMENT_PLAN.md 4.2.5).
 *
 * `POST /generate_recommendation` is the only endpoint that costs real money — every call
 * is an OpenAI completion — and nothing stopped a caller looping it. Authentication
 * narrowed *who* can do that; this bounds how often.
 *
 * Keyed by the **verified uid** where one is present, falling back to the client IP. Keying
 * on the uid matters: an IP is shared by everyone behind a NAT, so limiting on it alone
 * would let one user exhaust an office's budget, and a signed-in abuser could evade it by
 * changing networks.
 *
 * State is in memory, which is the right trade for a single-instance deployment and the
 * wrong one for several: each replica would enforce its own quota. Moving to a shared store
 * (Redis) is the change to make if this is ever scaled out.
 */

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
  /** Body key the failure message uses, so it matches the endpoint's own convention. */
  message: string;
}

export function rateLimit({ limit, windowMs, message }: RateLimitOptions) {
  const windows = new Map<string, Window>();

  // Drop expired entries so the map cannot grow without bound.
  const sweep = (now: number) => {
    for (const [key, window] of windows) {
      if (window.resetAt <= now) windows.delete(key);
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (windows.size > 1000) sweep(now);

    const key = req.auth?.uid ?? req.ip ?? 'unknown';
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      logger.warn(`Rate limit reached for ${key} on ${req.method} ${req.path}`);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ success: false, message });
      return;
    }

    existing.count += 1;
    next();
  };
}
