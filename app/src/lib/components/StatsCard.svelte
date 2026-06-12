<script lang="ts">
let {
  label,
  value,
  trend,
  icon,
  accent = 'primary',
  href,
}: {
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
  icon?: string;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet';
  href?: string;
} = $props();

const accentColors: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  violet: 'text-violet',
};

const trendUp = 'text-success';
const trendDown = 'text-destructive';
</script>

<svelte:element
  this={href ? 'a' : 'div'}
  href={href}
  class="metric-card group block"
  class:cursor-pointer={href}
>
  <div class="flex items-center justify-between">
    <span class="metric-label">{label}</span>
    {#if icon}
      <span class="text-xl {accentColors[accent]}" aria-hidden="true">{icon}</span>
    {/if}
  </div>
  <div class="metric-value {accentColors[accent]}">
    {value}
    {#if trend}
      <span
        class="ml-2 text-sm font-medium"
        class:text-success={trend.direction === 'up'}
        class:text-destructive={trend.direction === 'down'}
      >
        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
      </span>
    {/if}
  </div>
</svelte:element>
