<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Invoices — HiAi Admin</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">Invoices</h1>
    <p class="text-muted-foreground">All billing invoices</p>
  </div>

  <div class="rounded-lg border">
    <table class="w-full text-sm">
      <thead><tr class="border-b"><th class="p-3 text-left">Date</th><th class="p-3 text-left">Tenant</th><th class="p-3 text-left">Amount</th><th class="p-3 text-left">Status</th><th class="p-3 text-left">Invoice</th></tr></thead>
      <tbody>
        {#each data.invoices.items || [] as inv}
          <tr class="border-b last:border-0">
            <td class="p-3">{new Date(inv.created_at).toLocaleDateString()}</td>
            <td class="p-3">{inv.tenant_name || inv.tenant_id}</td>
            <td class="p-3">${(inv.amount / 100).toFixed(2)}</td>
            <td class="p-3"><StatusBadge status={inv.status} /></td>
            <td class="p-3">{#if inv.pdf_url}<a href={inv.pdf_url} class="text-primary hover:underline">PDF</a>{/if}</td>
          </tr>
        {:else}
          <tr><td colspan="5" class="p-8 text-center text-muted-foreground">No invoices found</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
