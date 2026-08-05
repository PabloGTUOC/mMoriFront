import { env } from '../config/env.js';

/**
 * Minimal level-aware logger.
 *
 * BACKEND_SPEC §9.4 notes the Rails backend used bare `puts` for debug output, bypassing
 * the logger entirely. Everything here goes through a level check instead, so debug noise
 * is off by default and can be switched on with LOG_LEVEL=debug.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;

type Level = keyof typeof LEVELS;

const threshold = LEVELS[env.logLevel] ?? LEVELS.info;

function emit(level: Exclude<Level, 'silent'>, args: unknown[]): void {
  if (LEVELS[level] < threshold) return;
  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase()}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(prefix, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => emit('debug', args),
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
};
