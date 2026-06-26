<script lang="ts">
import { goto } from '$app/navigation';
import type { SiteAdapterRow } from '$lib/plugins/site-adapter.js';

let { adapters, currentSlug }: { adapters: SiteAdapterRow[]; currentSlug?: string } = $props();

// biome-ignore lint/correctness/noUnusedVariables: used in template
const value = $derived(currentSlug ?? '');

function onChange(e: Event) {
  const next = (e.currentTarget as HTMLSelectElement).value;
  if (next && next !== value) {
    goto(`/sites/${next}`);
  }
}
</script>

{#if adapters.length > 1}
  <select
    aria-label="Switch site"
    value={value}
    onchange={onChange}
    class="h-8 rounded-md border border-input bg-background px-2 text-sm"
  >
    {#if !value}
      <option value="" disabled>Select site…</option>
    {/if}
    {#each adapters as adapter (adapter.slug)}
      <option value={adapter.slug}>{adapter.name}</option>
    {/each}
  </select>
{/if}