import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../db/schema/index.js';
import { env } from '../lib/config.js';
import { db } from '../lib/db.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('auth');

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    'http://localhost:50201',
    'http://localhost:50202',
    'http://localhost:50203',
    'http://127.0.0.1:50203',
  ],
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  emailAndPassword: { enabled: true },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
});

log.info('Better Auth initialized for hiai-admin');
export type Session = typeof auth.$Infer.Session;
