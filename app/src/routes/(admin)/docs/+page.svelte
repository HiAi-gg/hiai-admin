<script lang="ts">
import { onMount } from 'svelte';

let spec: any = $state(null);
let activeTag = $state('Health');
let expandedPath = $state('');

onMount(async () => {
  try {
    const res = await fetch('/api/openapi');
    spec = await res.json();
  } catch {
    // Fallback: load inline spec
    spec = null;
  }
});

const tags = [
  'Health',
  'Tenants',
  'Users',
  'Roles',
  'Permissions',
  'Billing',
  'Audit',
  'Settings',
  'Integrations',
  'Analytics',
  'Events',
];

function getPathsForTag(tag: string) {
  if (!spec?.paths) return [];
  return Object.entries(spec.paths)
    .filter(([_, methods]: [string, any]) =>
      Object.values(methods).some((m: any) => m.tags?.includes(tag)),
    )
    .map(([path, methods]: [string, any]) => ({ path, methods }));
}

function getMethodColor(method: string) {
  const colors: Record<string, string> = {
    get: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    post: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    put: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[method] || 'bg-gray-100 text-gray-800';
}

function togglePath(path: string) {
  expandedPath = expandedPath === path ? '' : path;
}
</script>

<svelte:head>
  <title>API Documentation — hiai-admin</title>
</svelte:head>

<div class="flex gap-6">
  <!-- Sidebar -->
  <nav class="w-48 shrink-0">
    <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endpoints</h2>
    <ul class="space-y-1">
      {#each tags as tag}
        <li>
          <button
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors {activeTag === tag ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
            onclick={() => activeTag = tag}
          >
            {tag}
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <!-- Content -->
  <div class="flex-1 min-w-0">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">API Reference</h1>
      <p class="text-muted-foreground mt-1">hiai-admin — Central admin panel for the HiAi SaaS platform</p>
      <p class="text-sm text-muted-foreground mt-2">Base URL: <code class="bg-muted px-1.5 py-0.5 rounded">http://localhost:50200</code></p>
    </div>

    {#if spec}
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">{activeTag}</h2>

        {#each getPathsForTag(activeTag) as { path, methods }}
          <div class="border rounded-lg overflow-hidden">
            {#each Object.entries(methods) as [method, details]}
              {@const d = details as any}
              <button
                class="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                onclick={() => togglePath(path + method)}
              >
                <span class="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold uppercase {getMethodColor(method)}">
                  {method}
                </span>
                <code class="text-sm font-mono">{path}</code>
                <span class="text-sm text-muted-foreground ml-auto">{d.summary || ''}</span>
              </button>

              {#if expandedPath === path + method}
                <div class="px-4 py-3 border-t bg-muted/30 space-y-3">
                  {#if d.description}
                    <p class="text-sm">{d.description}</p>
                  {/if}

                  {#if d.security}
                    <div class="flex items-center gap-2 text-sm">
                      <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs font-medium">Auth Required</span>
                    </div>
                  {/if}

                  {#if d.parameters?.length}
                    <div>
                      <h4 class="text-xs font-semibold text-muted-foreground uppercase mb-2">Parameters</h4>
                      <div class="space-y-1">
                        {#each d.parameters as param}
                          <div class="flex items-center gap-2 text-sm">
                            <code class="text-xs bg-muted px-1.5 py-0.5 rounded">{param.name}</code>
                            <span class="text-muted-foreground">{param.in}</span>
                            {#if param.required}
                              <span class="text-red-500 text-xs">required</span>
                            {/if}
                            <span class="text-muted-foreground text-xs">{param.schema?.type || ''}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if d.requestBody}
                    <div>
                      <h4 class="text-xs font-semibold text-muted-foreground uppercase mb-2">Request Body</h4>
                      <pre class="text-xs bg-muted p-3 rounded-lg overflow-x-auto">{JSON.stringify(d.requestBody.content?.['application/json']?.schema, null, 2)}</pre>
                    </div>
                  {/if}

                  {#if d.responses}
                    <div>
                      <h4 class="text-xs font-semibold text-muted-foreground uppercase mb-2">Responses</h4>
                      <div class="space-y-1">
                        {#each Object.entries(d.responses) as [code, resp]}
                          <div class="flex items-center gap-2 text-sm">
                            <span class="px-1.5 py-0.5 rounded text-xs font-mono {Number(code) < 400 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">{code}</span>
                            <span>{(resp as any).description || ''}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        {/each}

        {#if getPathsForTag(activeTag).length === 0}
          <p class="text-muted-foreground">No endpoints found for this tag.</p>
        {/if}
      </div>
    {:else}
      <div class="text-center py-12">
        <p class="text-muted-foreground">Loading API specification...</p>
        <p class="text-sm text-muted-foreground mt-2">Or view the OpenAPI spec at <code class="bg-muted px-1.5 py-0.5 rounded">/api/openapi</code></p>
      </div>
    {/if}
  </div>
</div>
