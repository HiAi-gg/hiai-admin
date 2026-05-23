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
      body: JSON.stringify({ reason: suspendReason })
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

<div class="flex items-center justify-between mb-6">
  <div>
    <h1 class="text-2xl font-bold">{data.tenant?.name}</h1>
    <p class="text-muted-foreground">{data.tenant?.slug} · <StatusBadge status={data.tenant?.status} /></p>
  </div>
  <div class="flex gap-2">
    {#if data.tenant?.status === 'active'}
      <button on:click={() => showSuspendModal = true} class="px-4 py-2 border border-destructive text-destructive rounded-lg">Suspend</button>
    {:else}
      <button on:click={reactivateTenant} class="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Reactivate</button>
    {/if}
  </div>
</div>

<div class="flex gap-4 mb-6 border-b">
  {#each ['info', 'settings', 'billing', 'users'] as tab}
    <button on:click={() => activeTab = tab} class="pb-2 px-1 {activeTab === tab ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}">{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
  {/each}
</div>

{#if activeTab === 'info'}
  <div class="grid grid-cols-2 gap-4">
    <div class="bg-card rounded-lg border p-4"><h3 class="font-medium mb-2">Details</h3><p>Email: {data.tenant?.email}</p><p>Plan: {data.tenant?.plan}</p><p>Created: {new Date(data.tenant?.createdAt).toLocaleDateString()}</p></div>
    <div class="bg-card rounded-lg border p-4"><h3 class="font-medium mb-2">Stripe</h3><p>Customer: {data.tenant?.stripeCustomerId || 'Not connected'}</p><p>Connect: {data.tenant?.stripeAccountId || 'Not connected'}</p></div>
  </div>
{:else if activeTab === 'users'}
  <div class="bg-card rounded-lg border">
    <table class="w-full"><thead><tr class="border-b"><th class="text-left p-3">Name</th><th class="text-left p-3">Email</th><th class="text-left p-3">Role</th></tr></thead>
    <tbody>{#each data.users as user}<tr class="border-b last:border-0"><td class="p-3">{user.name}</td><td class="p-3">{user.email}</td><td class="p-3">{user.role}</td></tr>{/each}</tbody></table>
  </div>
{/if}

{#if showSuspendModal}
  <ConfirmModal title="Suspend Tenant" message="Are you sure you want to suspend {data.tenant?.name}?" onConfirm={suspendTenant} onCancel={() => showSuspendModal = false}>
    <textarea bind:value={suspendReason} placeholder="Reason for suspension..." class="w-full px-3 py-2 border rounded-lg mt-2" rows="3"></textarea>
  </ConfirmModal>
{/if}
