<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import { AlertTriangle } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Access Denied — hiai-admin</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
  <div class="w-full max-w-sm">
    <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle class="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight">Access Denied</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        You don't have permission to access this page. Contact your administrator if you believe
        this is an error.
      </p>

      <div class="mt-6 flex flex-col gap-2">
        <a
          href="/dashboard"
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to Dashboard
        </a>
        <form method="POST" action="/api/auth/sign-out">
          <button
            type="submit"
            class="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>

    <p class="mt-6 text-center text-xs text-muted-foreground">Error 403 — Forbidden</p>
  </div>
</main>
