<script lang="ts">
  import StatsCard from '$lib/components/StatsCard.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Dashboard — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Dashboard</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard label="Total Tenants" value={data.overview.totalTenants} icon="🏪" />
    <StatsCard label="Active Tenants" value={data.overview.activeTenants} icon="✅" />
    <StatsCard label="New (30d)" value={data.overview.newTenants} icon="🆕" />
    <StatsCard label="MRR" value={`$${(data.overview.mrr / 100).toFixed(2)}`} icon="💰" />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="rounded-lg border bg-card p-6">
      <h2 class="text-lg font-semibold mb-4">Tenant Distribution by Plan</h2>
      <div class="space-y-3">
        {#each data.tenantsDistribution as item}
          <div class="flex items-center justify-between">
            <span class="capitalize">{item.plan}</span>
            <span class="font-medium">{item.count}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="rounded-lg border bg-card p-6">
      <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
      <div class="space-y-2">
        <a href="/tenants" class="block px-4 py-2 rounded bg-primary text-primary-foreground text-center hover:opacity-90">Manage Tenants</a>
        <a href="/users" class="block px-4 py-2 rounded bg-secondary text-secondary-foreground text-center hover:opacity-90">Manage Users</a>
        <a href="/settings" class="block px-4 py-2 rounded bg-secondary text-secondary-foreground text-center hover:opacity-90">Platform Settings</a>
      </div>
    </div>
  </div>
</div>
