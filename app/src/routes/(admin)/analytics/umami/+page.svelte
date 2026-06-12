<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Umami Analytics — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">📊 Umami Analytics</h1>
      <p class="text-sm text-muted-foreground">Privacy-focused web analytics</p>
    </div>
    {#if data?.umamiUrl}
      <a
        href={data.umamiUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
      >
        Open in new tab ↗
      </a>
    {/if}
  </div>

  {#if data?.umamiUrl}
    <div class="card overflow-hidden">
      <iframe
        src="{data.umamiUrl}/login"
        class="block h-[800px] w-full"
        title="Umami Dashboard"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
    <div class="rounded-md border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
      <strong class="text-foreground">Default credentials:</strong> {data.umamiUsername} / umami
      <br />
      <strong class="text-foreground">UMAMI_URL:</strong> <code class="font-mono">{data.umamiUrl}</code>
      {#if data?.umamiWebsiteId}
        <br />
        <strong class="text-foreground">Website ID:</strong> <code class="font-mono">{data.umamiWebsiteId}</code>
      {/if}
    </div>
  {:else}
    <div class="card p-8 text-center">
      <p class="text-muted-foreground">Configure <code class="font-mono">UMAMI_URL</code> in <code class="font-mono">.env</code> to view analytics.</p>
    </div>
  {/if}
</div>
