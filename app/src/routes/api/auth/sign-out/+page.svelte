<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';

// Backend URL: prefer PUBLIC_API_URL (browser-safe), fall back to same-host backend.
const BACKEND = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:50200';

let status = $state<'pending' | 'success' | 'error'>('pending');
let errorDetail = $state<string | null>(null);

/**
 * Best-effort POST to the backend sign-out endpoint.
 * Wrapped in try/catch so a network failure does NOT block the local
 * logout flow — the user is still signed out locally, and the UI
 * always ends up back on /login.
 */
async function signOut(): Promise<void> {
  status = 'pending';
  errorDetail = null;

  if (browser) {
    // Clear local state first so a backend hiccup never strands the user.
    authStore.setUser(null);

    try {
      const res = await fetch(`${BACKEND}/api/auth/sign-out`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        // Capture but do not throw — we still want to redirect.
        errorDetail = `Backend returned ${res.status}`;
      } else {
        status = 'success';
      }
    } catch (err) {
      errorDetail = err instanceof Error ? err.message : 'Sign-out request failed';
      status = 'error';
    }
  }

  // Replace history so the user cannot "back" into the protected area.
  await goto('/login', { replaceState: true, invalidateAll: true });
}

onMount(() => {
  void signOut();
});
</script>

<svelte:head>
  <title>Signing out — hiai-admin</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
  <div class="w-full max-w-sm text-center">
    <div
      class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow-sm"
    >
      H
    </div>
    <h1 class="text-2xl font-bold tracking-tight">Signing out…</h1>
    <p class="mt-2 text-sm text-muted-foreground">
      {#if status === 'pending'}
        Clearing your session and redirecting to the sign-in page.
      {:else if status === 'success'}
        You have been signed out. Redirecting…
      {:else}
        {#if errorDetail}
          <span class="text-destructive">Sign-out warning: {errorDetail}</span>
        {:else}
          Sign-out completed with warnings.
        {/if}
        Redirecting to the sign-in page…
      {/if}
    </p>

    <div class="mt-6 flex justify-center" aria-hidden="true">
      <svg
        class="h-6 w-6 animate-spin text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>

    <noscript>
      <p class="mt-4 text-xs text-muted-foreground">
        JavaScript is required to complete sign-out automatically.
        <a href="/login" class="font-medium text-foreground underline">Go to sign-in</a>
      </p>
    </noscript>
  </div>
</main>
