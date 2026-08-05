import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

/**
 * Firebase Admin initialisation, used to verify the ID tokens the Angular app sends.
 *
 * Credentials come from one of, in order:
 *   1. `FIREBASE_SERVICE_ACCOUNT_JSON` — the service account JSON inline.
 *   2. `GOOGLE_APPLICATION_CREDENTIALS` — a path, read by the SDK's default lookup.
 *
 * Unlike the frontend's Firebase config, **this is a real secret**. It must never be
 * committed; `.env` is gitignored and `.env.example` carries only the variable names.
 */

let app: App | null = null;
let attempted = false;

export function initializeFirebase(): App | null {
  if (app) return app;
  if (attempted) return null;
  attempted = true;

  try {
    if (getApps().length > 0) {
      app = getApps()[0]!;
      return app;
    }

    if (env.firebase.serviceAccountJson) {
      app = initializeApp({ credential: cert(JSON.parse(env.firebase.serviceAccountJson)) });
    } else if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
      app = initializeApp({ credential: applicationDefault() });
    } else {
      logger.warn(
        'No Firebase credentials configured — token verification is unavailable. ' +
          'Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
      );
      return null;
    }

    logger.info('Firebase Admin initialised');
    return app;
  } catch (error) {
    logger.error('Failed to initialise Firebase Admin:', error);
    return null;
  }
}

/** Returns null when credentials are absent, which `requireAuth` treats as "cannot verify". */
export function firebaseAuth(): Auth | null {
  const initialized = initializeFirebase();
  return initialized ? getAuth(initialized) : null;
}
