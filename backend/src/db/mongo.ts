import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Mongo connection management.
 *
 * BACKEND_SPEC §3 pins the database to `trainingappDB` and §9.1 notes the Rails config had
 * no production block at all. Here every environment reads the same `MONGODB_URI`.
 */

export async function connectToDatabase(uri: string = env.mongoUri): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info(`Connected to MongoDB (${redactUri(uri)})`);
  return mongoose;
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/** The `life_expectancy` reference collection has no model — see BACKEND_SPEC §3.7. */
export function rawCollection(name: string) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection is not established');
  return db.collection(name);
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}
