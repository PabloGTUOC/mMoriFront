import mongoose from 'mongoose';

/**
 * Resolves a MongoDB to run integration tests against, in priority order:
 *
 *   1. `TEST_MONGODB_URI` / `MONGODB_URI`, if one is set and reachable.
 *   2. An ephemeral in-memory server (`mongodb-memory-server`), which is the zero-setup
 *      path on a normal dev machine.
 *   3. `null` — the caller skips its suite.
 *
 * Step 3 exists because some sandboxes and locked-down CI runners can neither reach a
 * Mongo nor download the mongod binary. Those environments still run every DB-free test.
 */

export interface TestMongo {
  uri: string;
  stop: () => Promise<void>;
}

export async function startTestMongo(): Promise<TestMongo | null> {
  const configured = process.env['TEST_MONGODB_URI'] ?? process.env['MONGODB_URI'];

  if (configured && (await isReachable(configured))) {
    return { uri: configured, stop: async () => {} };
  }

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const server = await MongoMemoryServer.create();
    return {
      uri: server.getUri('mmori_test'),
      stop: () => server.stop(),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
    console.warn(
      `\n[tests] Skipping database integration tests — no MongoDB available (${reason}).\n` +
        '[tests] Start one and re-run, e.g. `docker run -d -p 27017:27017 mongo:7`,\n' +
        '[tests] or set TEST_MONGODB_URI to an existing instance.\n'
    );
    return null;
  }
}

async function isReachable(uri: string): Promise<boolean> {
  try {
    const connection = await mongoose
      .createConnection(uri, { serverSelectionTimeoutMS: 2000 })
      .asPromise();
    await connection.close();
    return true;
  } catch {
    return false;
  }
}

/** Drops every collection between tests so suites start from a known state. */
export async function clearDatabase(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}
