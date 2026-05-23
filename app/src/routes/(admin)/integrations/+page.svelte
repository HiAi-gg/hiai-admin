<script lang="ts">
</script>

<svelte:head><title>Integrations — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Integrations</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each [{ name: 'Stripe', type: 'stripe', icon: '💳', desc: 'Payments and billing' }, { name: 'Shippo', type: 'shippo', icon: '📦', desc: 'Shipping and labels' }, { name: 'HiAi Observe', type: 'observe', icon: '📊', desc: 'Error tracking and monitoring' }, { name: 'Novu', type: 'novu', icon: '🔔', desc: 'Notifications' }] as integration}
      <div class="rounded-lg border bg-card p-6">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{integration.icon}</span>
          <div>
            <h2 class="font-semibold">{integration.name}</h2>
            <p class="text-sm text-muted-foreground">{integration.desc}</p>
          </div>
        </div>
        <div class="mt-4">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted">Not connected</span>
        </div>
      </div>
    {/each}
  </div>
</div>
