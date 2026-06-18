<script lang="ts">
import '../app.css';
import type { Snippet } from 'svelte';
import type { LayoutData } from './$types';

// biome-ignore lint/correctness/noUnusedVariables: used in template
let { data, children }: { data: LayoutData; children: Snippet } = $props();

const umamiEnabled = $derived(Boolean(data.umami?.url && data.umami?.websiteId));
</script>

<svelte:head>
  {#if umamiEnabled}
    <script
      async
      defer
      data-website-id={data.umami.websiteId}
      src="{data.umami.url}/script.js"
    ></script>
  {/if}
</svelte:head>

{@render children()}
