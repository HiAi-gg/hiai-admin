<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.title ?? 'E-Commerce'} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold capitalize">{data.title ?? 'E-Commerce'}</h1>
  {#if data.error}
    <p class="text-destructive">{data.error}</p>
  {:else if data.data}
    <pre class="text-sm bg-muted p-4 rounded overflow-auto max-h-96">{JSON.stringify(data.data, null, 2)}</pre>
  {:else}
    <p class="text-muted-foreground">Loading from hiai-store backend...</p>
  {/if}
</div>
