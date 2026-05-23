import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../lib/config.js';
import * as schema from './schema/index.js';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

export async function dbHealthCheck(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
