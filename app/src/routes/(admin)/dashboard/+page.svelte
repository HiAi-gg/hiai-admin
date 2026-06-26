<script lang="ts">
import { BarChart, LineChart, PieChart } from 'layerchart';
import { StatsCard } from '@hiai/ui';
import { api } from '$lib/api.js';
import { Building2, CheckCircle2, Sparkles, DollarSign } from 'lucide-svelte';

let { data } = $props();

type EventItem = { type: string; data: Record<string, unknown>; timestamp: string };
let events = $state<EventItem[]>([]);
let churn = $state<{ month: string; churn: number }[]>([]);
let tenantGrowth = $state<{ month: string; newTenants: number }[]>([]);
let revenueByPlan = $state<{ plan: string; revenue: number }[]>([]);

// Load additional analytics on mount
$effect(() => {
  (async () => {
    try {
      const churnRes = await api.get<{ history: { month: string; churn: number }[] }>(
        '/api/analytics/churn',
      );
      churn = (churnRes.history ?? []).map((p) => ({ month: p.month, churn: p.churn }));
    } catch {
      churn = [];
    }

    try {
      const growthRes = await api.get<{ history: { month: string; newTenants: number }[] }>(
        '/api/analytics/tenant-growth',
      );
      tenantGrowth = (growthRes.history ?? []).map((p) => ({
        month: p.month,
        newTenants: p.newTenants,
      }));
    } catch {
      // Fallback: synthesize empty growth series (still 12 months for chart continuity)
      const months: { month: string; newTenants: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: d.toLocaleString('en-US', { month: 'short' }),
          newTenants: 0,
        });
      }
      tenantGrowth = months;
    }

    // Derive revenue per plan from plan distribution (placeholder prices per plan)
    const planPrices: Record<string, number> = { free: 0, pro: 2900, enterprise: 9900 };
    const dist = data.tenantsDistribution ?? [];
    revenueByPlan = dist.map((d: { plan: string; count: number }) => ({
      plan: d.plan,
      revenue: (planPrices[d.plan] ?? 0) * d.count,
    }));
  })();
});

// SSE for live activity feed
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

const mrrHistory = data.mrrHistory ?? [];
const planColors: Record<string, string> = {
  free: 'hsl(220 10% 60%)',
  pro: 'hsl(217 91% 60%)',
  enterprise: 'hsl(262 83% 58%)',
};
const planLabels: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};
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
    <StatsCard
      label="Total Tenants"
      value={data.overview.totalTenants}
      icon={Building2}
      accent="primary"
      href="/tenants"
    />
    <StatsCard
      label="Active Tenants"
      value={data.overview.activeTenants}
      icon={CheckCircle2}
      accent="success"
      href="/tenants"
    />
    <StatsCard
      label="New (30d)"
      value={data.overview.newTenants}
      icon={Sparkles}
      accent="info"
      href="/tenants"
    />
    <StatsCard
      label="MRR"
      value={`$${((data.overview.mrr ?? 0) / 100).toFixed(2)}`}
      icon={DollarSign}
      accent="violet"
      href="/billing"
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="card p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">MRR Trend</h2>
        <span class="text-xs text-muted-foreground">Last 12 months</span>
      </div>
      <div class="h-64">
        {#if mrrHistory.length > 0}
          <LineChart
            data={mrrHistory}
            x="month"
            y="mrr"
            yDomain={[0, null]}
            yNice
            padding={{ top: 16, right: 16, bottom: 32, left: 56 }}
            tooltip={{ mode: 'bisect-x' }}
          />
        {:else}
          <div class="h-full flex items-center justify-center text-muted-foreground text-sm">
            No MRR data yet
          </div>
        {/if}
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Revenue by Plan</h2>
      </div>
      <div class="h-64">
        {#if revenueByPlan.length > 0}
          <PieChart
            data={revenueByPlan}
            key="plan"
            value="revenue"
            c="plan"
            cRange={revenueByPlan.map((d) => planColors[d.plan] ?? 'hsl(220 10% 60%)')}
            innerRadius={60}
            padAngle={0.02}
            padding={{ top: 8, right: 8, bottom: 8, left: 8 }}
            tooltip
          />
          <div class="mt-3 space-y-1.5">
            {#each revenueByPlan as item}
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-full"
                    style="background: {planColors[item.plan] ?? '#94a3b8'}"
                  ></span>
                  <span class="font-medium">{planLabels[item.plan] ?? item.plan}</span>
                </div>
                <span class="text-muted-foreground">
                  ${(item.revenue / 100).toFixed(0)}/mo
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="h-full flex items-center justify-center text-muted-foreground text-sm">
            No plan data yet
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Tenant Growth</h2>
        <span class="text-xs text-muted-foreground">Last 12 months</span>
      </div>
      <div class="h-56">
        {#if tenantGrowth.length > 0}
          <BarChart
            data={tenantGrowth}
            x="month"
            y="newTenants"
            yDomain={[0, null]}
            yNice
            padding={{ top: 16, right: 16, bottom: 32, left: 48 }}
            tooltip
          />
        {:else}
          <div class="h-full flex items-center justify-center text-muted-foreground text-sm">
            No growth data yet
          </div>
        {/if}
      </div>
    </div>

    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Churn Rate</h2>
        <span class="text-xs text-muted-foreground">Last 12 months</span>
      </div>
      <div class="h-56">
        {#if churn.length > 0}
          <LineChart
            data={churn}
            x="month"
            y="churn"
            yDomain={[0, null]}
            yNice
            padding={{ top: 16, right: 16, bottom: 32, left: 48 }}
            tooltip={{ mode: 'bisect-x' }}
          />
        {:else}
          <div class="h-full flex items-center justify-center text-muted-foreground text-sm">
            No churn data yet
          </div>
        {/if}
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
        {#each events as evt (evt.timestamp + evt.type)}
          <div
            class="flex items-start gap-3 p-2.5 rounded-md bg-muted/40 transition-colors hover:bg-muted/60"
          >
            <div
              class="mt-1.5 h-2 w-2 shrink-0 rounded-full {evt.type.includes('error') ||
              evt.type.includes('failed')
                ? 'bg-destructive'
                : 'bg-success'}"
            ></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{evt.type}</p>
              <p class="text-xs text-muted-foreground">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        {/each}
        {#if events.length === 0}
          <div class="flex flex-col items-center justify-center py-8 text-center">
            <div
              class="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2"
            >
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
        <a
          href="/tenants"
          class="block px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-center text-sm font-medium shadow-sm transition-colors hover:bg-primary-hover"
        >
          Manage Tenants
        </a>
        <a
          href="/users"
          class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent"
        >
          Manage Users
        </a>
        <a
          href="/billing"
          class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent"
        >
          Billing
        </a>
        <a
          href="/settings"
          class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent"
        >
          Platform Settings
        </a>
        <a
          href="/security/audit"
          class="block px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-center text-sm font-medium transition-colors hover:bg-accent"
        >
          Audit Logs
        </a>
      </div>
    </div>
  </div>
</div>
