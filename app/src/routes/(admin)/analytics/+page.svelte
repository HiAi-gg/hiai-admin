<script lang="ts">
  import StatsCard from '$lib/components/StatsCard.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let { data } = $props();
  let timeRange = $state('30d');

  const mrrTrend = data.mrr?.trend || [];
  const maxMrr = Math.max(...mrrTrend.map((m: { mrr: number }) => m.mrr), 1);

  const planDist = data.tenantDistribution?.byPlan || [];
  const planColors: Record<string, string> = { free: '#94a3b8', pro: '#3b82f6', enterprise: '#8b5cf6' };
</script>

<svelte:head>
  <title>Analytics — HiAi Admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Analytics</h1>
      <p class="text-muted-foreground">Platform performance metrics</p>
    </div>
    <div class="flex gap-2">
      {#each ['7d', '30d', '90d', 'all'] as range}
        <button
          onclick={() => timeRange = range}
          class="px-3 py-1.5 text-sm rounded-md transition-colors"
          class:bg-primary={timeRange === range}
          class:text-primary-foreground={timeRange === range}
          class:bg-muted={timeRange !== range}
        >{range}</button>
      {/each}
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatsCard label="MRR" value={`$${((data.overview?.mrr || 0) / 100).toLocaleString()}`} icon="💰" />
    <StatsCard label="ARR" value={`$${((data.overview?.arr || 0) / 100).toLocaleString()}`} icon="📈" />
    <StatsCard label="Churn Rate" value={`${data.overview?.churnRate || 0}%`} icon="📉" />
    <StatsCard label="ARPU" value={`$${((data.overview?.arpu || 0) / 100).toFixed(0)}`} icon="🏢" />
  </div>

  <!-- MRR Trend Chart (SVG bar chart) -->
  <div class="rounded-lg border bg-card p-6">
    <h3 class="text-lg font-semibold mb-4">MRR Trend</h3>
    {#if mrrTrend.length > 0}
      <div class="h-56 flex items-end gap-1 px-2">
        {#each mrrTrend as point, i}
          <div class="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div class="relative w-full group">
              <div
                class="w-full rounded-t bg-primary/80 transition-all hover:bg-primary cursor-pointer"
                style="height: {maxMrr > 0 ? Math.max((point.mrr / maxMrr) * 200, 4) : 4}px"
              ></div>
              <div class="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap shadow-md z-10">
                ${((point.mrr || 0) / 100).toFixed(2)}
              </div>
            </div>
            {#if i % Math.max(1, Math.floor(mrrTrend.length / 6)) === 0}
              <span class="text-[10px] text-muted-foreground truncate w-full text-center">{point.month}</span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="h-56 flex items-center justify-center text-muted-foreground">No MRR data available</div>
    {/if}
  </div>

  <!-- Tenant Distribution + Top Tenants -->
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="rounded-lg border bg-card p-6">
      <h3 class="text-lg font-semibold mb-4">Tenant Distribution by Plan</h3>
      {#if planDist.length > 0}
        {@const total = planDist.reduce((s: number, d: { count: number }) => s + d.count, 0)}
        <div class="space-y-4">
          {#each planDist as plan}
            {@const pct = total > 0 ? Math.round((plan.count / total) * 100) : 0}
            <div>
              <div class="flex items-center justify-between text-sm mb-1.5">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" style="background: {planColors[plan.plan] || '#94a3b8'}"></div>
                  <span class="capitalize font-medium">{plan.plan}</span>
                </div>
                <span class="text-muted-foreground">{plan.count} ({pct}%)</span>
              </div>
              <div class="h-3 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" style="width: {pct}%; background: {planColors[plan.plan] || '#94a3b8'}"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-muted-foreground text-center py-8">No tenant data available</p>
      {/if}
    </div>

    <div class="rounded-lg border bg-card p-6">
      <h3 class="text-lg font-semibold mb-4">Growth Metrics</h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <span class="text-sm">New tenants (30d)</span>
          <span class="font-bold text-lg">{data.overview?.newTenants || 0}</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <span class="text-sm">Active tenants</span>
          <span class="font-bold text-lg">{data.overview?.activeTenants || 0}</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <span class="text-sm">Trial conversions</span>
          <span class="font-bold text-lg">{data.overview?.trialConversions || 0}%</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <span class="text-sm">Avg lifetime (months)</span>
          <span class="font-bold text-lg">{data.overview?.avgLifetime || 0}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Top Tenants -->
  <div class="rounded-lg border bg-card overflow-hidden">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Top Tenants</h3>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b bg-muted/50">
          <th class="p-3 text-left font-medium text-muted-foreground">Tenant</th>
          <th class="p-3 text-left font-medium text-muted-foreground">Plan</th>
          <th class="p-3 text-left font-medium text-muted-foreground">Status</th>
          <th class="p-3 text-right font-medium text-muted-foreground">Created</th>
        </tr>
      </thead>
      <tbody>
        {#each (data.tenantsDistribution?.topTenants || []).slice(0, 10) as tenant}
          <tr class="border-b last:border-0 hover:bg-muted/30 transition-colors">
            <td class="p-3">
              <a href="/tenants/{tenant.id}" class="font-medium hover:text-primary transition-colors">{tenant.name}</a>
            </td>
            <td class="p-3 capitalize">{tenant.plan}</td>
            <td class="p-3"><StatusBadge status={tenant.status} /></td>
            <td class="p-3 text-right text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</td>
          </tr>
        {:else}
          <tr><td colspan="4" class="p-8 text-center text-muted-foreground">No tenant data</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
