import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './config.js';
import { createChildLogger } from './logger.js';
import * as schema from '../db/schema/index.js';

const log = createChildLogger('db');

const client = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

export async function dbHealthCheck(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (err) {
    log.error({ err }, 'Database health check failed');
    return false;
  }
}

export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}
