<script lang="ts">
  let { label, value, trend, icon }: {
    label: string;
    value: string | number;
    trend?: { value: number; direction: 'up' | 'down' };
    icon?: string;
  } = $props();
</script>

<div class="rounded-lg border bg-card p-6 shadow-sm">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-muted-foreground">{label}</span>
    {#if icon}
      <span class="text-2xl">{icon}</span>
    {/if}
  </div>
  <div class="mt-2">
    <span class="text-3xl font-bold">{value}</span>
    {#if trend}
      <span class="ml-2 text-sm" class:text-green-600={trend.direction === 'up'} class:text-red-600={trend.direction === 'down'}>
        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
      </span>
    {/if}
  </div>
</div>
