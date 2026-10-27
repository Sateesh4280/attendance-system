/**
 * Optional zero-install MongoDB for local development.
 *
 *   npm run dev:db
 *
 * Starts an in-memory MongoDB on port 27017 so you can run Attendly without
 * installing MongoDB or creating an Atlas cluster. Data lives only as long as
 * this process runs; use a real MongoDB instance when you need persistence.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.DEV_DB_PORT) || 27017;

const mongod = await MongoMemoryServer.create({
  instance: { port, dbName: 'attendance', storageEngine: 'wiredTiger' },
});

console.log(`[dev-db] MongoDB is listening on ${mongod.getUri('attendance')}`);
console.log('[dev-db] This database is in memory; data is lost when the process stops.');
console.log('[dev-db] Seed it with: npm run seed --prefix server -- --force');

const shutdown = async (signal) => {
  console.log(`\n[dev-db] ${signal} received, shutting down...`);
  await mongod.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Keep the event loop alive while the in-memory server runs.
setInterval(() => {}, 1 << 30);
