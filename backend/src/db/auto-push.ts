#!/usr/bin/env bun
/**
 * DB_AUTO_PUSH gate.
 *
 * `drizzle-kit push` is DESTRUCTIVE — it drops columns whose definitions
 * were removed, rewrites types, and may drop data. It must NEVER run
 * implicitly. This script enforces explicit opt-in: the operator sets
 * DB_AUTO_PUSH=true in the environment to allow the push.
 *
 * Typical usage from a CI / migration job:
 *
 *   DB_AUTO_PUSH=true bun run db:auto-push     # actually pushes
 *   bun run db:auto-push                       # fails fast with a clear message
 *
 * For production, prefer `bun run db:generate` + `bun run db:migrate`
 * (creates a checked-in SQL migration that operators review before applying).
 * `db:auto-push` is for development environments only.
 */
import { execSync } from 'node:child_process';

const enabled = process.env.DB_AUTO_PUSH === 'true' || process.env.DB_AUTO_PUSH === '1';

if (!enabled) {
  console.error('');
  console.error('[db:auto-push] ABORTED: DB_AUTO_PUSH is not set.');
  console.error('');
  console.error('  `drizzle-kit push` is destructive (drops columns, rewrites types).');
  console.error('  For production use committed migrations instead:');
  console.error('');
  console.error('    bun run db:generate    # produces a SQL migration in backend/drizzle/');
  console.error('    bun run db:migrate     # applies pending migrations');
  console.error('');
  console.error('  If you really want to push the current schema, run:');
  console.error('');
  console.error('    DB_AUTO_PUSH=true bun run db:auto-push');
  console.error('');
  process.exit(1);
}

console.log('[db:auto-push] DB_AUTO_PUSH=true — running `drizzle-kit push --force` …');
try {
  execSync('bunx drizzle-kit push --force', { stdio: 'inherit' });
} catch (err) {
  console.error('[db:auto-push] drizzle-kit push failed:', err);
  process.exit(1);
}

console.log('[db:auto-push] schema pushed.');
