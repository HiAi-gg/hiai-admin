<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import StatusBadge from '$lib/components/StatusBadge.svelte';

let { data } = $props();

// biome-ignore lint/correctness/noUnusedVariables: button onclick
async function handlePortal() {
  const res = await fetch('/api/billing/portal', { method: 'POST' });
  const { url } = await res.json();
  window.location.href = url;
}
</script>

<svelte:head>
  <title>Billing — HiAi Admin</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Billing</h1>
    <p class="text-muted-foreground">Manage platform subscription and payments</p>
  </div>

  {#if data.subscription}
    <div class="rounded-lg border p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Current Subscription</h3>
        <StatusBadge status={data.subscription.status} />
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <div>
          <span class="text-sm text-muted-foreground">Plan</span>
          <p class="text-2xl font-bold">{data.subscription.plan}</p>
        </div>
        <div>
          <span class="text-sm text-muted-foreground">Period End</span>
          <p class="text-2xl font-bold">{new Date(data.subscription.current_period_end).toLocaleDateString()}</p>
        </div>
        <div>
          <span class="text-sm text-muted-foreground">Auto Renew</span>
          <p class="text-2xl font-bold">{data.subscription.cancel_at_period_end ? 'No' : 'Yes'}</p>
        </div>
      </div>
      <div class="mt-4">
        <button onclick={handlePortal} class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
          Manage Billing →
        </button>
      </div>
    </div>
  {/if}

  <div class="grid gap-4 md:grid-cols-3">
    {#each data.plans as plan}
      <div class="rounded-lg border p-6" class:border-primary={data.subscription?.plan === plan.id}>
        <h3 class="text-lg font-semibold">{plan.name}</h3>
        <p class="text-3xl font-bold mt-2">${plan.price}<span class="text-sm font-normal text-muted-foreground">/mo</span></p>
        <ul class="mt-4 space-y-2 text-sm">
          {#each plan.features as feature}
            <li class="flex items-center gap-2"><span class="text-success">✓</span> {feature}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  <div class="rounded-lg border">
    <div class="p-4 border-b"><h3 class="font-semibold">Invoice History</h3></div>
    <table class="w-full text-sm">
      <thead><tr class="border-b"><th class="p-3 text-left">Date</th><th class="p-3 text-left">Amount</th><th class="p-3 text-left">Status</th><th class="p-3 text-left">Invoice</th></tr></thead>
      <tbody>
        {#each data.invoices.items || [] as inv}
          <tr class="border-b last:border-0">
            <td class="p-3">{new Date(inv.created_at).toLocaleDateString()}</td>
            <td class="p-3">${(inv.amount / 100).toFixed(2)}</td>
            <td class="p-3"><StatusBadge status={inv.status} /></td>
            <td class="p-3">{#if inv.pdf_url}<a href={inv.pdf_url} class="text-primary hover:underline">Download</a>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
