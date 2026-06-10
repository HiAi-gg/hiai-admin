<script lang="ts">
let { data } = $props();
</script>

<svelte:head><title>Umami Analytics — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">📊 Umami Analytics</h1>
  {#if data?.umamiUrl}
    <iframe src="{data.umamiUrl}/dashboard" class="w-full h-[800px] rounded-lg border" title="Umami Dashboard"></iframe>
  {:else}
    <p class="text-muted-foreground">Configure UMAMI_URL in settings to view analytics.</p>
  {/if}
</div>
