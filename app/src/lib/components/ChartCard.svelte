<script lang="ts">
import type { Snippet } from 'svelte';

let {
  title,
  description,
  timeRange = '30d',
  onTimeRangeChange,
  children,
}: {
  title: string;
  description?: string;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  children: Snippet;
} = $props();

const timeRanges = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];
</script>

<div class="rounded-lg border border-border bg-card p-6">
  <div class="flex items-center justify-between mb-4">
    <div>
      <h3 class="text-lg font-semibold">{title}</h3>
      {#if description}
        <p class="text-sm text-muted-foreground">{description}</p>
      {/if}
    </div>

    <div class="flex gap-1 rounded-md border p-1">
      {#each timeRanges as range}
        <button
          onclick={() => onTimeRangeChange?.(range.value)}
          class="rounded-sm px-2 py-1 text-xs font-medium transition-colors"
          class:bg-primary={timeRange === range.value}
          class:text-primary-foreground={timeRange === range.value}
          class:text-muted-foreground={timeRange !== range.value}
          class:hover:bg-accent={timeRange !== range.value}
        >
          {range.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="h-[300px]">
    {@render children()}
  </div>
</div>
