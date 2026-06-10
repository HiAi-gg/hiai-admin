<script lang="ts">
let { data } = $props();
let integrations = $state(
  data.integrations || [
    {
      id: 'stripe',
      name: 'Stripe',
      type: 'stripe',
      icon: '💳',
      desc: 'Payments and billing',
      status: 'disconnected',
      lastSync: null,
    },
    {
      id: 'shippo',
      name: 'Shippo',
      type: 'shippo',
      icon: '📦',
      desc: 'Shipping and label generation',
      status: 'disconnected',
      lastSync: null,
    },
    {
      id: 'observe',
      name: 'HiAi Observe',
      type: 'observe',
      icon: '📊',
      desc: 'Error tracking and monitoring',
      status: 'disconnected',
      lastSync: null,
    },
    {
      id: 'novu',
      name: 'Novu',
      type: 'novu',
      icon: '🔔',
      desc: 'Notification delivery',
      status: 'disconnected',
      lastSync: null,
    },
  ],
);
let testing = $state<string | null>(null);
let testResult = $state<{ id: string; success: boolean; message: string } | null>(null);

async function testConnection(id: string) {
  testing = id;
  testResult = null;
  try {
    const res = await fetch(`/api/integrations/${id}/test`, { method: 'POST' });
    const result = await res.json();
    testResult = { id, success: result.success, message: result.message };
  } catch (e: any) {
    testResult = { id, success: false, message: e.message };
  } finally {
    testing = null;
  }
}

async function disconnect(id: string) {
  await fetch(`/api/integrations/${id}`, { method: 'DELETE' });
  integrations = integrations.map((i: { id: string; status: string }) =>
    i.id === id ? { ...i, status: 'disconnected' } : i,
  );
}

function statusColor(status: string) {
  return status === 'connected'
    ? 'bg-success/10 text-success'
    : status === 'error'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-muted text-muted-foreground';
}
</script>

<svelte:head><title>Integrations — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Integrations</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each integrations as integration}
      <div class="rounded-lg border bg-card p-6">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">{integration.icon}</span>
          <div class="flex-1">
            <h2 class="font-semibold">{integration.name}</h2>
            <p class="text-sm text-muted-foreground">{integration.desc}</p>
          </div>
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium {statusColor(integration.status)}">
            {integration.status}
          </span>
        </div>

        {#if integration.lastSync}
          <p class="text-xs text-muted-foreground mb-3">Last sync: {new Date(integration.lastSync).toLocaleString()}</p>
        {/if}

        {#if testResult && testResult.id === integration.id}
          <div class="mb-3 p-2 rounded text-sm {testResult.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}">
            {testResult.message}
          </div>
        {/if}

        <div class="flex gap-2">
          {#if integration.status === 'connected'}
            <button
              onclick={() => testConnection(integration.id)}
              disabled={testing === integration.id}
              class="flex-1 px-3 py-1.5 rounded border text-sm hover:bg-muted disabled:opacity-50"
            >
              {testing === integration.id ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onclick={() => disconnect(integration.id)}
              class="px-3 py-1.5 rounded border border-destructive text-destructive text-sm hover:bg-destructive/10"
            >
              Disconnect
            </button>
          {:else}
            <a
              href={`/api/integrations/${integration.id}/connect`}
              class="flex-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm text-center hover:opacity-90"
            >
              Connect
            </a>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
