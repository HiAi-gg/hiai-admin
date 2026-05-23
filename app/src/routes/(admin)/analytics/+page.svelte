<script lang="ts">
  import StatsCard from '$lib/components/StatsCard.svelte';
  import ChartCard from '$lib/components/ChartCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Analytics — HiAi Admin</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Analytics</h1>
    <p class="text-muted-foreground">Platform performance metrics</p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatsCard label="MRR" value={`$${((data.overview.mrr || 0) / 100).toLocaleString()}`} icon="💰" trend={data.mrr.trend?.length > 0 ? `${data.mrr.trend[data.mrr.trend.length - 1].change}%` : undefined} trendDirection="up" />
    <StatsCard label="ARR" value={`$${((data.overview.arr || 0) / 100).toLocaleString()}`} icon="📈" />
    <StatsCard label="Churn Rate" value={`${data.overview.churnRate || 0}%`} icon="📉" trendDirection="down" />
    <StatsCard label="Avg Revenue Per Tenant" value={`$${((data.overview.arpu || 0) / 100).toFixed(0)}`} icon="🏢" />
  </div>

  <div class="grid gap-6 lg:grid-cols-2">
    <ChartCard title="MRR Trend" description="Monthly Recurring Revenue over time">
      <div class="flex h-full items-center justify-center text-muted-foreground">Chart renders with LayerChart</div>
    </ChartCard>

    <ChartCard title="Churn Rate" description="Monthly churn percentage">
      <div class="flex h-full items-center justify-center text-muted-foreground">Chart renders with LayerChart</div>
    </ChartCard>
  </div>

  <div class="rounded-lg border border-border bg-card p-6">
    <h3 class="text-lg font-semibold mb-4">Tenant Distribution by Plan</h3>
    <div class="grid gap-4 md:grid-cols-3">
      {#each data.tenantDistribution.byPlan || [] as plan}
        <div class="rounded-lg border p-4 text-center">
          <p class="text-2xl font-bold">{plan.count}</p>
          <p class="text-sm text-muted-foreground">{plan.plan} plan</p>
        </div>
      {/each}
    </div>
  </div>
</div>
