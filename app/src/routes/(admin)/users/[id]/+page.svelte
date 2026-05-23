<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  let { data } = $props();
  let activeTab = $state('profile');
</script>

<svelte:head><title>{data.user?.name || 'User'} — hiai-admin</title></svelte:head>

<div class="mb-6">
  <h1 class="text-2xl font-bold">{data.user?.name}</h1>
  <p class="text-muted-foreground">{data.user?.email} · {data.user?.role}</p>
</div>

<div class="flex gap-4 mb-6 border-b">
  {#each ['profile', 'roles', 'tenants', 'sessions'] as tab}
    <button on:click={() => activeTab = tab} class="pb-2 px-1 {activeTab === tab ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}">{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
  {/each}
</div>

{#if activeTab === 'profile'}
  <div class="bg-card rounded-lg border p-6 max-w-lg">
    <div class="space-y-4">
      <div><label class="text-sm text-muted-foreground">Name</label><p class="font-medium">{data.user?.name}</p></div>
      <div><label class="text-sm text-muted-foreground">Email</label><p class="font-medium">{data.user?.email}</p></div>
      <div><label class="text-sm text-muted-foreground">Role</label><p class="font-medium">{data.user?.role}</p></div>
      <div><label class="text-sm text-muted-foreground">2FA</label><p class="font-medium">{data.user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p></div>
      <div><label class="text-sm text-muted-foreground">Last Login</label><p class="font-medium">{data.user?.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleString() : 'Never'}</p></div>
    </div>
  </div>
{:else if activeTab === 'roles'}
  <div class="bg-card rounded-lg border p-4"><p class="text-muted-foreground">Role management will appear here</p></div>
{:else if activeTab === 'tenants'}
  <div class="bg-card rounded-lg border p-4"><p class="text-muted-foreground">Tenant access list will appear here</p></div>
{:else if activeTab === 'sessions'}
  <div class="bg-card rounded-lg border p-4"><p class="text-muted-foreground">Active sessions will appear here</p></div>
{/if}
