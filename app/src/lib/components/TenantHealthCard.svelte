<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template (<StatsCard>)
import { StatsCard } from '@hiai/ui';
import { CheckCircle2, Flame, Bell, Package } from 'lucide-svelte';

/**
 * TenantHealthCard — surface a tenant's observe-side health metrics
 * (errors, uptime, alerts) inside the admin tenant detail page.
 *
 * Data source: the hiai-observe plugin proxy at /api/observe/dashboard.
 * Auth: the admin's plugin proxy injects the observe API key configured
 * for the admin shell. The tenant's observe project_id is mapped 1:1
 * from the admin tenant id (see docs/EMBED.md → Scope Parameters).
 *
 * Graceful degradation: if observe is unreachable or the tenant has no
 * observe project yet, the card renders a "No observe data" state instead
 * of breaking the page.
 */

type ObserveDashboard = {
  errorCount24h: number;
  uptimePercent: number;
  activeContainers: number;
  traceCount24h: number;
  alertCount?: number;
  monitorStatuses: { id: string; name: string; isUp: boolean }[];
};

let { tenantId }: { tenantId: string } = $props();

// biome-ignore lint/correctness/noUnusedVariables: used in template ({#if loading}, {#if data && !loading})
let loading = $state(true);
let data = $state<ObserveDashboard | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: used in template ({:else if error})
let error = $state<string | null>(null);

$effect(() => {
  if (!tenantId) return;
  loading = true;
  error = null;

  // The admin's hiai-observe plugin proxy mounts /api/observe/* and the
  // observe backend's tenant-scope middleware normalises project_id from
  // either project_id, projectId, tenant_id, or tenantId. Send both for
  // belt-and-braces.
  const qs = new URLSearchParams({
    project_id: tenantId,
    projectId: tenantId,
  }).toString();

  fetch(`/api/observe/dashboard?${qs}`, {
    headers: { Accept: 'application/json' },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`observe responded ${res.status}`);
      return res.json() as Promise<ObserveDashboard>;
    })
    .then((d) => {
      data = d;
      loading = false;
    })
    .catch((e: unknown) => {
      error = e instanceof Error ? e.message : String(e);
      loading = false;
    });
});

// biome-ignore lint/correctness/noUnusedVariables: used in template (sr-only span)
const errorRate = $derived.by(() => {
  if (!data) return 0;
  // crude: errors / max(1, traces) — gives a percentage sense
  return Math.min(100, (data.errorCount24h / Math.max(1, data.traceCount24h)) * 100);
});
</script>

<section
  class="rounded-lg border bg-card p-6"
  aria-labelledby="tenant-health-heading"
>
  <header class="mb-4 flex items-center justify-between">
    <div>
      <h3 id="tenant-health-heading" class="font-semibold">Observe Health</h3>
      <p class="text-xs text-muted-foreground">
        Live metrics from hiai-observe for tenant {tenantId.slice(0, 8)}…
      </p>
    </div>
    {#if data && !loading && !error}
      <a
        href="/observe?tenant_id={tenantId}"
        class="text-xs text-primary hover:underline"
      >
        Open in Observe →
      </a>
    {/if}
  </header>

  {#if loading}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {#each Array(4) as _}
        <div class="h-20 animate-pulse rounded-md bg-muted/40"></div>
      {/each}
    </div>
  {:else if error}
    <div
      class="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm"
      role="status"
    >
      <p class="font-medium text-destructive">No observe data</p>
      <p class="mt-1 text-muted-foreground">
        {error}. The tenant may not have an observe project yet, or the observe
        backend is unreachable. Errors on this page do not block the rest of
        the admin shell.
      </p>
    </div>
  {:else if data}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatsCard
        label="Uptime (24h)"
        value="{data.uptimePercent?.toFixed(1) ?? 0}%"
        icon={CheckCircle2 as unknown as string}
        accent={data.uptimePercent >= 99.9 ? 'success' : data.uptimePercent >= 99 ? 'warning' : 'danger'}
        href="/observe/uptime?tenant_id={tenantId}"
      />
      <StatsCard
        label="Errors (24h)"
        value={data.errorCount24h}
        icon={Flame as unknown as string}
        accent={data.errorCount24h === 0 ? 'success' : data.errorCount24h > 100 ? 'danger' : 'warning'}
        href="/observe/issues?tenant_id={tenantId}"
      />
      <StatsCard
        label="Active alerts"
        value={data.alertCount ?? 0}
        icon={Bell as unknown as string}
        accent={(data.alertCount ?? 0) === 0 ? 'success' : 'warning'}
        href="/observe/alerts?tenant_id={tenantId}"
      />
      <StatsCard
        label="Containers"
        value={data.activeContainers}
        icon={Package as unknown as string}
        accent="info"
        href="/observe/infrastructure?tenant_id={tenantId}"
      />
    </div>

    {#if data.monitorStatuses.length > 0}
      <div class="mt-4 border-t pt-4">
        <p class="mb-2 text-xs font-medium text-muted-foreground">
          Monitors ({data.monitorStatuses.filter((m) => m.isUp).length}/{data.monitorStatuses.length} up)
        </p>
        <ul class="space-y-1.5">
          {#each data.monitorStatuses.slice(0, 5) as m (m.id)}
            <li class="flex items-center justify-between text-sm">
              <span class="truncate">{m.name}</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                class:bg-success={m.isUp}
                class:text-success-foreground={m.isUp}
                class:bg-destructive={!m.isUp}
                class:text-destructive-foreground={!m.isUp}
              >
                {m.isUp ? 'up' : 'down'}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- errorRate is exposed for future trend visualisation; computed but
         unused in the current layout to keep the card concise. -->
    <span class="sr-only">Error rate: {errorRate.toFixed(2)}%</span>
  {/if}
</section>