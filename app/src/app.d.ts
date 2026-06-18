// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { Session } from 'better-auth';

/**
 * SessionUser is the shape of a user object after authentication.
 * Defined as the actual user object returned from better-auth with optional fields used in the app.
 */
interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  role?: string;
  twoFactorEnabled?: boolean;
  two_factor_enabled?: boolean;
  /** Tenant ids the user may access (empty for super_admin = all). Set in hooks.server.ts. */
  tenantIds?: string[];
}

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session: Session | null;
      user: SessionUser | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}
