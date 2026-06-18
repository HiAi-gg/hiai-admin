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
  trustedOrigins: [env.BETTER_AUTH_URL, ...env.BETTER_AUTH_TRUSTED_ORIGINS],
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
