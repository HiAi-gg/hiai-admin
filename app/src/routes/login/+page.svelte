<script lang="ts">
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth.svelte.js';

let email = $state('');
let password = $state('');
let submitting = $state(false);
let errorMessage = $state<string | null>(null);

let emailField = $state<HTMLInputElement | null>(null);

$effect(() => {
  emailField?.focus();
});

async function handleSubmit(event: SubmitEvent) {
  event.preventDefault();
  if (submitting) return;

  errorMessage = null;

  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    errorMessage = 'Email and password are required.';
    return;
  }

  submitting = true;
  try {
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, password }),
    });

    const payload = (await res.json().catch(() => null)) as
      | { user?: { id: string; email: string; name?: string; role?: string } }
      | { message?: string; error?: string }
      | null;

    if (!res.ok) {
      const message =
        (payload && 'message' in payload && payload.message) ||
        (payload && 'error' in payload && payload.error) ||
        'Invalid email or password.';
      errorMessage = message;
      return;
    }

    if (payload && 'user' in payload && payload.user) {
      authStore.setUser({
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.name ?? payload.user.email,
        role: payload.user.role ?? 'staff',
      });
    }

    await goto('/dashboard');
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unable to reach the server.';
  } finally {
    submitting = false;
  }
}
</script>

<svelte:head>
  <title>Sign in — hiai-admin</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold tracking-tight">hiai-admin</h1>
      <p class="mt-1 text-sm text-muted-foreground">Sign in to the platform control center</p>
    </div>

    <form
      class="space-y-5 rounded-lg border bg-card p-6 shadow-sm"
      onsubmit={handleSubmit}
      novalidate
    >
      <div class="space-y-2">
        <label for="email" class="text-sm font-medium leading-none">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="username"
          required
          bind:value={email}
          bind:this={emailField}
          disabled={submitting}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="admin@example.com"
        />
      </div>

      <div class="space-y-2">
        <label for="password" class="text-sm font-medium leading-none">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          bind:value={password}
          disabled={submitting}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {#if errorMessage}
        <div
          role="alert"
          aria-live="polite"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      {/if}

      <button
        type="submit"
        disabled={submitting}
        class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {#if submitting}
          <svg
            class="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Signing in…</span>
        {:else}
          <span>Sign in</span>
        {/if}
      </button>
    </form>

    <p class="mt-6 text-center text-xs text-muted-foreground">
      Restricted to authorized platform administrators.
    </p>
  </div>
</main>
