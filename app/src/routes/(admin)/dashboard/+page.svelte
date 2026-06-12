<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import StatsCard from '$lib/components/StatsCard.svelte';

let { data } = $props();
let events = $state<Array<{ type: string; data: Record<string, unknown>; timestamp: string }>>([]);

$effect(() => {
  const es = new EventSource('/api/events');
  es.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data);
      if (parsed.type !== 'connected') {
        events = [parsed, ...events].slice(0, 20);
      }
    } catch {}
  };
  return () => es.close();
});

const mrrHistory = data.mrrHistory || [];
// biome-ignore lint/correctness/noUnusedVariables: used in template
const maxMrr = Math.max(...mrrHistory.map((m: { mrr: number }) => m.mrr), 1);
</script>

<svelte:head>
  <title>Dashboard — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p class="text-sm text-muted-foreground">Platform overview & key metrics</p>
    </div>
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <span class="inline-block h-2 w-2 rounded-full bg-success animate-pulse"></span>
      <span>Live</span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard label="Total Tenants" value={data.overview.totalTenants} icon="🏪" accent="primary" href="/tenants" />
    <StatsCard label="Active Tenants" value={data.overview.activeTenants} icon="✅" accent="success" href="/tenants" />
    <StatsCard label="New (30d)" value={data.overview.newTenants} icon="🆕" accent="info" href="/tenants" />
    <StatsCard label="MRR" value={`$${(data.overview.mrr / 100).toFixed(2)}`} icon="💰" accent="violet" href="/billing" />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="card p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">MRR Trend</h2>
        <span class="text-xs text-muted-foreground">Last 12 months</span>
      </div>
      <div class="h-48 flex items-end gap-1">
        {#each mrrHistory as point, i}
          <div class="flex-1 flex flex-col items-center gap-1">
            <div
              class="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
              style="height: {maxMrr > 0 ? (point.mrr / maxMrr) * 100 : 0}%"
              title={`${point.month}: $${(point.mrr / 100).toFixed(2)}`}
            ></div>
            {#if i % 3 === 0}
              <span class="text-[10px] text-muted-foreground">{point.month}</span>
            {/if}
          </div>
        {/each}
        {#if mrrHistory.length === 0}
          <div class="flex-1 flex items-center justify-center text-muted-foreground text-sm">No MRR data yet</div>
        {/if}
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Plans</h2>
      </div>
      <div class="space-y-3">
        {#each data.tenantsDistribution as item}
          {@const total = data.tenantsDistribution.reduce((s: number, d: { count: number }) => s + d.count, 0)}
          {@const pct = total > 0 ? Math.round((item.count / total) * 100) : 0}
          <div>
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="capitalize font-medium">{item.plan}</span>
              <span class="text-muted-foreground">{item.count} ({pct}%)</span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
              <div class="h-full rounded-full bg-primary transition-all" style="width: {pct}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Live Activity</h2>
        <span class="text-xs text-muted-foreground">SSE stream</span>
      </div>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        {#each events as evt}
          <div class="flex items-start gap-3 p-2.5 rounded-md bg-muted/40 transition-colors hover:bg-muted/60">
            <div class="mt-1.5 h-2 w-2 shrink-0 rounded-full {evt.type.includes('error') || evt.type.includes('failed') ? 'bg-destructive' : 'bg-success'}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{evt.type}</p>
              <p class="text-xs text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        {/each}
        {#if events.length === 0}
          <div class="flex flex-col items-center justify-center py-8 text-center">
            <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
              <span class="h-2 w-2 rounded-full bg-muted-foreground animate-pulse"></span>
            </div>
            <p class="text-sm text-muted-foreground">Waiting for events…</p>
          </div>
        {/if}
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Quick Actions</h2>
      </div>
      <div class="space-y-2">
        <a href="/tenants" class="block px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-center text-sm font-medium shadow-sm transition-colors hover:bg-primary-hover">Manage Tenants</a>
        <a href="/users" class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent">Manage Users</a>
        <a href="/billing" class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent">Billing</a>
        <a href="/settings" class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent">Platform Settings</a>
        <a href="/security/audit" class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent">Audit Logs</a>
      </div>
    </div>
  </div>
</div>
