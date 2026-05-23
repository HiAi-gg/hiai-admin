import { betterAuth } from 'better-auth';
import { env } from '../lib/config.js';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('auth');

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: {
    url: env.DATABASE_URL,
    type: 'postgresql',
  },
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
