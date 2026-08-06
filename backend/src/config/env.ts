import 'dotenv/config';

/**
 * Central environment configuration.
 *
 * BACKEND_SPEC §9 flags two operational gaps in the Rails original: Mongoid had no
 * `production:` block, and CORS was hardcoded to http://localhost:4200. Both are
 * environment-driven here.
 */

function str(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  port: int('PORT', 3000),

  /** Database name defaults to `trainingappDB` to match BACKEND_SPEC §3. */
  mongoUri: str('MONGODB_URI', 'mongodb://localhost:27017/trainingappDB'),

  /** Comma-separated list. BACKEND_SPEC §2 allowed only the Angular dev server. */
  corsOrigins: str('CORS_ORIGINS', 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  openai: {
    /** `CHATGPT_API_KEY` is the name the Rails backend used; kept as an alias. */
    apiKey: process.env.OPENAI_API_KEY ?? process.env.CHATGPT_API_KEY ?? '',
    baseUrl: str('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    model: str('OPENAI_MODEL', 'gpt-4o-mini'),
    maxTokens: int('OPENAI_MAX_TOKENS', 300),
    temperature: Number.parseFloat(str('OPENAI_TEMPERATURE', '0.7')),
    /** BACKEND_SPEC §9.6: the Rails version had no timeout at all. */
    timeoutMs: int('OPENAI_TIMEOUT_MS', 20000),
  },

  /**
   * Staged rollout of token enforcement (FRONTEND_IMPROVEMENT_PLAN.md §4.4).
   * `optional` is the default so shipping this cannot break a client that is not yet
   * sending a token; flip to `required` once unauthenticated traffic reaches zero.
   */
  authMode: str('AUTH_MODE', 'optional') as 'disabled' | 'optional' | 'required',

  /**
   * `verifyIdToken(token, true)` also catches sign-out-everywhere and disabled accounts,
   * at the cost of a network round trip per request. Off by default.
   */
  checkRevoked: str('AUTH_CHECK_REVOKED', 'false') === 'true',

  /**
   * Bounds on POST /generate_recommendation — the one endpoint that costs money per call.
   * Ten an hour is generous for the UI, which fires one per mood selection.
   */
  recommendationRateLimit: int('RECOMMENDATION_RATE_LIMIT', 10),
  recommendationRateWindowMs: int('RECOMMENDATION_RATE_WINDOW_MS', 60 * 60 * 1000),

  firebase: {
    /** A real secret, unlike the frontend's Firebase config. Never commit it. */
    serviceAccountJson: process.env['FIREBASE_SERVICE_ACCOUNT_JSON'] ?? '',
  },

  logLevel: str('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error' | 'silent',
} as const;

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
