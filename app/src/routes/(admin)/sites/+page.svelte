<script lang="ts">
let { data } = $props();

const adapters = $derived(data.adapters ?? []);
</script>

<svelte:head>
  <title>Sites — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Sites</h1>
      <p class="text-sm text-muted-foreground">Manage connected site adapters</p>
    </div>
    <a
      href="/sites/connect"
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
    >
      + Connect site
    </a>
  </div>

  {#if data.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {data.error}
    </div>
  {:else if adapters.length === 0}
    <div class="rounded-md border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
      No sites connected. <a href="/sites/connect" class="text-primary hover:underline">Connect one</a>.
    </div>
  {:else}
    <div class="overflow-x-auto rounded-md border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th class="px-4 py-3">Name</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">Modules</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each adapters as adapter (adapter.slug)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-3 font-medium">{adapter.name}</td>
              <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{adapter.slug}</td>
              <td class="px-4 py-3 text-sm">
                {#if adapter.modules && adapter.modules.length > 0}
                  <span class="inline-flex gap-1">
                    {#each adapter.modules as module}
                      <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{module}</span>
                    {/each}
                  </span>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <span
                  class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    adapter.enabled !== false
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {adapter.enabled !== false ? 'Enabled' : 'Disabled'}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <a href={`/sites/${adapter.slug}`} class="text-primary hover:underline">
                  Details
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
