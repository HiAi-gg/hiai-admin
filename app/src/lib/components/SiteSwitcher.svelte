<script lang="ts">
import { goto } from '$app/navigation';
import type { SiteAdapterRow } from '$lib/plugins/site-adapter.js';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

let { adapters, currentSlug }: { adapters: SiteAdapterRow[]; currentSlug?: string } = $props();

const value = $derived(currentSlug ?? '');

function onChange(next: string) {
  if (next && next !== value) {
    goto(`/sites/${next}`);
  }
}
</script>

{#if adapters.length > 1}
  <SelectRoot type="single" {value} onValueChange={onChange}>
    <SelectTrigger class="h-8 w-[180px]" aria-label="Switch site">
      <SelectValue placeholder="Select site\u2026" />
    </SelectTrigger>
    <SelectContent>
      {#each adapters as adapter (adapter.slug)}
        <SelectItem value={adapter.slug}>{adapter.name}</SelectItem>
      {/each}
    </SelectContent>
  </SelectRoot>
{/if}
