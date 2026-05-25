<script lang="ts">
  import { StatsCard } from '@hiai/ui';
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
  const maxMrr = Math.max(...mrrHistory.map((m: { mrr: number }) => m.mrr), 1);
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

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- MRR Trend Line Chart -->
    <div class="rounded-lg border bg-card p-6 lg:col-span-2">
      <h2 class="text-lg font-semibold mb-4">MRR Trend</h2>
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

    <!-- Plan Distribution -->
    <div class="rounded-lg border bg-card p-6">
      <h2 class="text-lg font-semibold mb-4">Plans</h2>
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
    <!-- Live Activity Feed (SSE) -->
    <div class="rounded-lg border bg-card p-6">
      <h2 class="text-lg font-semibold mb-4">Live Activity</h2>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        {#each events as evt}
          <div class="flex items-start gap-3 p-2 rounded bg-muted/50">
            <div class="w-2 h-2 rounded-full mt-1.5 {evt.type.includes('error') || evt.type.includes('failed') ? 'bg-destructive' : 'bg-success'}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">{evt.type}</p>
              <p class="text-xs text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        {/each}
        {#if events.length === 0}
          <p class="text-sm text-muted-foreground text-center py-4">Waiting for events...</p>
        {/if}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="rounded-lg border bg-card p-6">
      <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
      <div class="space-y-2">
        <a href="/tenants" class="block px-4 py-2 rounded bg-primary text-primary-foreground text-center hover:opacity-90">Manage Tenants</a>
        <a href="/users" class="block px-4 py-2 rounded bg-secondary text-secondary-foreground text-center hover:opacity-90">Manage Users</a>
        <a href="/billing" class="block px-4 py-2 rounded bg-secondary text-secondary-foreground text-center hover:opacity-90">Billing</a>
        <a href="/settings" class="block px-4 py-2 rounded bg-secondary text-secondary-foreground text-center hover:opacity-90">Platform Settings</a>
        <a href="/security/audit" class="block px-4 py-2 rounded bg-secondary text-secondary-foreground text-center hover:opacity-90">Audit Logs</a>
      </div>
    </div>
  </div>
</div>
