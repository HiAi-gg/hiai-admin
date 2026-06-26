<script lang="ts">
import { invalidateAll } from '$app/navigation';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

// biome-ignore lint/correctness/noUnusedVariables: used in template
const tenants = $derived(data.tenants ?? []);

let slug = $state('');
let role = $state<'viewer' | 'editor' | 'tenant_admin' | 'super_admin'>('viewer');
// biome-ignore lint/correctness/noUnusedVariables: used in template
let joining = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let joiningError = $state('');
let joiningSuccess = $state('');

// biome-ignore lint/correctness/noUnusedVariables: used in template
let leavingId = $state<string | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let leaveError = $state('');

// biome-ignore lint/correctness/noUnusedVariables: form submit handler
async function joinTenant(event: Event) {
  event.preventDefault();
  joiningError = '';
  joiningSuccess = '';
  if (!slug.trim()) {
    joiningError = 'Tenant slug is required';
    return;
  }
  joining = true;
  try {
    const res = await fetch('/api/profile/tenants/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug.trim(), role }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error ?? 'Failed to join tenant');
    }
    const status = body?.data?.status;
    if (status === 'joined') {
      joiningSuccess = `Joined ${body.data.name}`;
    } else if (status === 'already_member') {
      joiningError = 'You are already a member of this tenant';
    } else if (status === 'not_found') {
      joiningError = 'No tenant with that slug exists';
    } else {
      joiningSuccess = 'Request completed';
    }
    slug = '';
    await invalidateAll();
    setTimeout(() => (joiningSuccess = ''), 3000);
  } catch (err) {
    joiningError = err instanceof Error ? err.message : 'Failed to join tenant';
  } finally {
    joining = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: button onclick handler
async function leaveTenant(tenantId: string, name: string) {
  if (!confirm(`Leave ${name}? You will lose access to its data.`)) return;
  leaveError = '';
  leavingId = tenantId;
  try {
    const res = await fetch(`/api/profile/tenants/${tenantId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to leave tenant');
    }
    await invalidateAll();
  } catch (err) {
    leaveError = err instanceof Error ? err.message : 'Failed to leave tenant';
  } finally {
    leavingId = null;
  }
}
</script>

<svelte:head>
  <title>Tenants — Profile — hiai-admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
  <nav class="text-xs text-muted-foreground">
    <a href="/profile" class="hover:text-foreground">← Back to profile</a>
  </nav>

  <header>
    <h1 class="text-2xl font-bold">Your tenants</h1>
    <p class="text-muted-foreground">
      Tenants you have access to. Join an existing tenant by its slug.
    </p>
  </header>

  <section class="rounded-lg border bg-card">
    <header class="border-b p-4">
      <h2 class="text-lg font-semibold">Join a tenant</h2>
      <p class="text-xs text-muted-foreground">
        Enter the tenant's slug (a super admin or site admin can share it with you).
      </p>
    </header>
    <form onsubmit={joinTenant} class="space-y-4 p-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="space-y-1.5 sm:col-span-2">
          <label for="join-slug" class="block text-sm font-medium">Tenant slug</label>
          <input
            id="join-slug"
            type="text"
            bind:value={slug}
            placeholder="acme"
            pattern="[a-z0-9-]+"
            required
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="space-y-1.5">
          <label for="join-role" class="block text-sm font-medium">Role on tenant</label>
          <select
            id="join-role"
            bind:value={role}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="tenant_admin">Tenant admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
      </div>
      {#if joiningError}
        <p class="text-xs text-destructive">{joiningError}</p>
      {/if}
      {#if joiningSuccess}
        <p class="text-xs text-success">{joiningSuccess}</p>
      {/if}
      <div class="flex justify-end">
        <button
          type="submit"
          disabled={joining}
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join tenant'}
        </button>
      </div>
    </form>
  </section>

  <section class="rounded-lg border bg-card">
    <header class="border-b p-4">
      <h2 class="text-lg font-semibold">Current memberships</h2>
    </header>
    {#if leaveError}
      <div class="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
        {leaveError}
      </div>
    {/if}
    {#if tenants.length === 0}
      <div class="p-8 text-center text-sm text-muted-foreground">
        You aren't a member of any tenant yet.
      </div>
    {:else}
      <div class="divide-y">
        {#each tenants as tenant (tenant.tenantId)}
          <div class="flex items-center justify-between gap-4 p-4">
            <div class="min-w-0">
              <div class="truncate font-medium text-sm">{tenant.name}</div>
              <div class="truncate text-xs text-muted-foreground">
                <code>{tenant.slug}</code> · {tenant.plan} · {tenant.status}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
              >
                {tenant.role}
              </span>
              <button
                type="button"
                onclick={() => leaveTenant(tenant.tenantId, tenant.name)}
                disabled={leavingId === tenant.tenantId}
                class="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {leavingId === tenant.tenantId ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>