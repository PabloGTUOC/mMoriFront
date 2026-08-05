import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { router } from './routes.js';
import { logger } from './lib/logger.js';
import { ParameterMissingError } from './lib/params.js';
import { HTTP } from './lib/http.js';

/**
 * Express application factory.
 *
 * Kept separate from `server.ts` so tests can mount the app without binding a port or
 * owning the database connection.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  /**
   * BACKEND_SPEC §2: CORS allowed only http://localhost:4200, with any header and every
   * method. Same policy, but the origin list comes from CORS_ORIGINS so a deployed
   * frontend does not need a code change (§9.2).
   */
  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: '*',
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.use(router);

  // Unknown route — JSON, not Express' HTML default.
  app.use((_req, res) => {
    res.status(HTTP.notFound).json({ success: false, error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}

/**
 * Central error handling. The Rails `ApplicationController` had none — no `rescue_from`,
 * no shared handling (§7) — so an unexpected failure surfaced as a bare 500.
 *
 * Two cases are mapped explicitly:
 *   - a missing strong-parameter wrapper is Rails' `ActionController::ParameterMissing`
 *     → 400, matching §6.
 *   - malformed JSON is a 400 rather than a 500.
 */
function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ParameterMissingError) {
    res.status(HTTP.badRequest).json({ success: false, error: error.message });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(HTTP.badRequest).json({ success: false, error: 'Malformed JSON body' });
    return;
  }

  logger.error('Unhandled error:', error);
  res.status(HTTP.serverError).json({
    success: false,
    error: 'Internal server error',
  });
}
