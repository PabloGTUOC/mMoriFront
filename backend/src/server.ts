import { createApp } from './app.js';
import { connectToDatabase, disconnectFromDatabase } from './db/mongo.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

/**
 * Process entrypoint: connect to Mongo first, then start listening, so the app never
 * accepts traffic it cannot serve.
 */
async function main(): Promise<void> {
  await connectToDatabase();

  if (!env.openai.apiKey) {
    logger.warn(
      'OPENAI_API_KEY is not set — POST /generate_recommendation will return 422 until it is.'
    );
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`mMori backend listening on http://localhost:${env.port} (${env.nodeEnv})`);
    logger.info(`CORS origins: ${env.corsOrigins.join(', ')}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectFromDatabase().finally(() => process.exit(0));
    });
    // Don't hang forever on lingering keep-alive connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
