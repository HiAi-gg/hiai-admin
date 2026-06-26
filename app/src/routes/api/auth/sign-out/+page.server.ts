import { redirect, type Actions } from '@sveltejs/kit';

/**
 * Server-side actions for the sign-out page.
 *
 * The `+page.svelte` is the canonical user-facing implementation — it
 * POSTs to the backend in `onMount` and clears local state. This
 * `+page.server.ts` exists ONLY to support the legacy `<form method="POST">`
 * in `@hiai/ui` AdminHeader, which posts to `/api/auth/sign-out` as a
 * plain HTML form submission. Without a default action, SvelteKit would
 * return 405 for the POST and the user would see an error page.
 *
 * We just redirect to `/api/auth/sign-out` (GET) — which renders the
 * `+page.svelte` and runs the client-side sign-out flow there. This
 * keeps the single source of truth on the page itself.
 */
export const actions: Actions = {
  default: () => {
    throw redirect(303, '/api/auth/sign-out');
  },
};
