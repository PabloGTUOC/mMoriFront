import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The API suite covers controller behaviour; token verification is covered by
    // require-auth.test.ts, which sets the mode it needs per test.
    env: { AUTH_MODE: 'disabled' },
    include: ['tests/**/*.test.ts'],
    // Integration tests share one Mongo database; run files sequentially so they
    // don't clear each other's fixtures.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
