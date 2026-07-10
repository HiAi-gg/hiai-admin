<script lang="ts">
import { enhance } from '$app/forms';
import type { PageData, ActionData } from './$types';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

let { data, form }: { data: PageData; form: ActionData } = $props();

let tenantIdVal = $state(form?.values?.tenantId ?? '');

const MODULES: { id: string; label: string }[] = [
  { id: 'articles', label: 'Articles' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'domains', label: 'Domain' },
  { id: 'kofi', label: 'Ko-fi' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'generation', label: 'Generation' },
];

let backendUrl = $state(form?.values?.backendUrl ?? '');
let auth = $state(form?.values?.auth ?? 'jwt');
let health = $state<{ state: 'idle' | 'checking' | 'ok' | 'fail'; detail?: string }>({
  state: 'idle',
});
let submitting = $state(false);

async function testConnection() {
  if (!backendUrl) return;
  health = { state: 'checking' };
  try {
    const res = await fetch('/api/site-adapters/check-health', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ backendUrl }),
    });
    const body = await res.json().catch(() => ({}));
    health = body.ok
      ? { state: 'ok', detail: `HTTP ${body.status}` }
      : { state: 'fail', detail: body.status ? `HTTP ${body.status}` : 'unreachable' };
  } catch {
    health = { state: 'fail', detail: 'request failed' };
  }
}
</script>

<div class="mx-auto max-w-2xl">
  <header class="mb-6">
    <h1 class="text-2xl font-semibold text-foreground">Connect a site</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Register an external site backend as a Site adapter. The admin proxies its API and surfaces
      the selected CMS modules.
    </p>
  </header>

  {#if form?.error}
    <div class="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {form.error}
    </div>
  {/if}

  <form
    method="POST"
    class="space-y-5"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
  >
    <div class="space-y-1.5">
      <label for="tenantId" class="text-sm font-medium text-foreground">Tenant</label>
      <SelectRoot type="single" bind:value={tenantIdVal}>
        <SelectTrigger class="w-full" id="tenantId">
          <SelectValue placeholder="Select a tenant…" />
        </SelectTrigger>
        <SelectContent>
          {#each data.tenants as tenant (tenant.id)}
            <SelectItem value={tenant.id}>{tenant.name} ({tenant.slug})</SelectItem>
          {/each}
        </SelectContent>
      </SelectRoot>
      <input type="hidden" name="tenantId" value={tenantIdVal} />
    </div>

    <div class="space-y-1.5">
      <label for="name" class="text-sm font-medium text-foreground">Display name</label>
      <input
        id="name"
        name="name"
        required
        value={form?.values?.name ?? ''}
        placeholder="Example"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>

    <div class="space-y-1.5">
      <label for="slug" class="text-sm font-medium text-foreground">Slug (plugin id)</label>
      <input
        id="slug"
        name="slug"
        required
        value={form?.values?.slug ?? ''}
        placeholder="example-site"
        pattern="[a-z0-9-]+"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <p class="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens. Used as the proxy prefix <code>/api/&lt;slug&gt;</code>.</p>
    </div>

    <div class="space-y-1.5">
      <label for="backendUrl" class="text-sm font-medium text-foreground">Backend URL</label>
      <div class="flex gap-2">
        <input
          id="backendUrl"
          name="backendUrl"
          type="url"
          required
          bind:value={backendUrl}
          placeholder="http://api:3001"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onclick={testConnection}
          disabled={!backendUrl || health.state === 'checking'}
          class="shrink-0 rounded-md border border-input bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          {health.state === 'checking' ? 'Checking…' : 'Test'}
        </button>
      </div>
      {#if health.state === 'ok'}
        <span class="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs text-success">
          Reachable · {health.detail}
        </span>
      {:else if health.state === 'fail'}
        <span class="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
          Health check failed · {health.detail}
        </span>
      {/if}
    </div>

    <div class="space-y-1.5">
      <label for="auth" class="text-sm font-medium text-foreground">Auth mode</label>
      <SelectRoot type="single" bind:value={auth}>
        <SelectTrigger class="w-full" id="auth">
          <SelectValue placeholder="Select auth mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="jwt">Backend JWT (SSO)</SelectItem>
          <SelectItem value="api-key">API key</SelectItem>
        </SelectContent>
      </SelectRoot>
      <input type="hidden" name="auth" value={auth} />
    </div>

    {#if auth === 'jwt'}
      <div class="space-y-1.5">
        <label for="jwtSecret" class="text-sm font-medium text-foreground">Shared JWT secret (optional)</label>
        <input
          id="jwtSecret"
          name="jwtSecret"
          type="password"
          autocomplete="off"
          placeholder="Shared with the site backend for SSO"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p class="text-xs text-muted-foreground">Stored encrypted. Used to mint the backend token for SSO.</p>
      </div>
    {/if}

    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-foreground">Modules</legend>
      <div class="grid grid-cols-2 gap-2">
        {#each MODULES as mod (mod.id)}
          <label class="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name={`module:${mod.id}`}
              checked={(form?.values?.modules as string[] | undefined)?.includes(mod.id) ?? false}
              class="rounded border-input"
            />
            {mod.label}
          </label>
        {/each}
      </div>
    </fieldset>

    <div class="flex justify-end gap-2 pt-2">
      <a
        href="/dashboard"
        class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
      >
        Cancel
      </a>
      <button
        type="submit"
        disabled={submitting}
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? 'Connecting…' : 'Connect site'}
      </button>
    </div>
  </form>
</div>
