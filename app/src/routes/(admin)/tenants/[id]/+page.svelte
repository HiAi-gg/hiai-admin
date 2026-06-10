<script lang="ts">
import StatusBadge from '$lib/components/StatusBadge.svelte';
import ConfirmModal from '$lib/components/ConfirmModal.svelte';

let { data } = $props();
let activeTab = $state('info');
let showSuspendModal = $state(false);
let suspendReason = $state('');

async function suspendTenant() {
  await fetch(`/api/tenants/${data.tenant.id}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: suspendReason }),
  });
  showSuspendModal = false;
  window.location.reload();
}

async function reactivateTenant() {
  await fetch(`/api/tenants/${data.tenant.id}/reactivate`, { method: 'POST' });
  window.location.reload();
}
</script>

<svelte:head><title>{data.tenant?.name || 'Tenant'} — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">{data.tenant?.name}</h1>
      <p class="text-muted-foreground">{data.tenant?.slug} · <StatusBadge status={data.tenant?.status} /></p>
    </div>
    <div class="flex gap-2">
      {#if data.tenant?.status === 'active'}
        <button onclick={() => showSuspendModal = true} class="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm hover:bg-destructive/10">Suspend</button>
      {:else}
        <button onclick={reactivateTenant} class="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">Reactivate</button>
      {/if}
    </div>
  </div>

  <div class="flex gap-4 border-b">
    {#each ['info', 'settings', 'billing', 'users'] as tab}
      <button onclick={() => activeTab = tab} class="pb-2 px-1 text-sm transition-colors"
        class:border-b-2={activeTab === tab}
        class:border-primary={activeTab === tab}
        class:font-medium={activeTab === tab}
        class:text-muted-foreground={activeTab !== tab}
      >{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
    {/each}
  </div>

  {#if activeTab === 'info'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-lg border bg-card p-6">
        <h3 class="font-semibold mb-4">Details</h3>
        <div class="space-y-3">
          <div class="flex justify-between"><span class="text-muted-foreground">Email</span><span class="font-medium">{data.tenant?.email || 'N/A'}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Plan</span><span class="font-medium capitalize">{data.tenant?.plan}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Created</span><span class="font-medium">{new Date(data.tenant?.createdAt).toLocaleDateString()}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Trial Ends</span><span class="font-medium">{data.tenant?.trialEndsAt ? new Date(data.tenant.trialEndsAt).toLocaleDateString() : 'N/A'}</span></div>
        </div>
      </div>
      <div class="rounded-lg border bg-card p-6">
        <h3 class="font-semibold mb-4">Stripe</h3>
        <div class="space-y-3">
          <div class="flex justify-between"><span class="text-muted-foreground">Customer ID</span><span class="font-mono text-sm">{data.tenant?.stripeCustomerId || 'Not connected'}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Connect Account</span><span class="font-mono text-sm">{data.tenant?.stripeAccountId || 'Not connected'}</span></div>
        </div>
      </div>
    </div>

  {:else if activeTab === 'users'}
    <div class="rounded-lg border bg-card overflow-hidden">
      <div class="p-4 border-b"><h3 class="font-semibold">Tenant Users</h3></div>
      <table class="w-full text-sm">
        <thead><tr class="border-b bg-muted/50">
          <th class="p-3 text-left font-medium text-muted-foreground">Name</th>
          <th class="p-3 text-left font-medium text-muted-foreground">Email</th>
          <th class="p-3 text-left font-medium text-muted-foreground">Role</th>
        </tr></thead>
        <tbody>
          {#each data.users as user}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="p-3"><a href="/users/{user.id}" class="font-medium hover:text-primary">{user.name}</a></td>
              <td class="p-3 text-muted-foreground">{user.email}</td>
              <td class="p-3 capitalize">{user.role}</td>
            </tr>
          {:else}
            <tr><td colspan="3" class="p-8 text-center text-muted-foreground">No users assigned</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

  {:else if activeTab === 'billing'}
    <div class="rounded-lg border bg-card p-6">
      <h3 class="font-semibold mb-4">Subscription</h3>
      {#if data.tenant?.subscription}
        <div class="grid grid-cols-2 gap-4">
          <div><span class="text-sm text-muted-foreground">Plan</span><p class="font-medium capitalize">{data.tenant.subscription.plan}</p></div>
          <div><span class="text-sm text-muted-foreground">Status</span><p><StatusBadge status={data.tenant.subscription.status} /></p></div>
          <div><span class="text-sm text-muted-foreground">Period End</span><p class="font-medium">{new Date(data.tenant.subscription.currentPeriodEnd).toLocaleDateString()}</p></div>
          <div><span class="text-sm text-muted-foreground">Auto Renew</span><p class="font-medium">{data.tenant.subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}</p></div>
        </div>
      {:else}
        <p class="text-muted-foreground">No active subscription</p>
      {/if}
    </div>

  {:else if activeTab === 'settings'}
    <div class="rounded-lg border bg-card p-6">
      <h3 class="font-semibold mb-4">Tenant Settings</h3>
      <div class="space-y-4">
        {#each Object.entries(data.tenant?.settings || {}) as [key, value]}
          <div class="flex items-center justify-between p-3 rounded border">
            <span class="text-sm font-medium">{key}</span>
            <span class="text-sm text-muted-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </div>
        {:else}
          <p class="text-muted-foreground text-center py-4">No custom settings configured</p>
        {/each}
      </div>
    </div>
  {/if}
</div>

{#if showSuspendModal}
  <ConfirmModal
    title="Suspend Tenant"
    message="Are you sure you want to suspend {data.tenant?.name}?"
    confirmLabel="Suspend"
    variant="destructive"
    requireReason={true}
    onConfirm={suspendTenant}
    onCancel={() => showSuspendModal = false}
  />
{/if}
