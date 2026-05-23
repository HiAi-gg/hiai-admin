<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Tenants — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Tenants</h1>
    <a href="/tenants/new" class="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90">+ New Tenant</a>
  </div>

  <div class="rounded-lg border bg-card overflow-hidden">
    <table class="w-full">
      <thead class="bg-muted/50">
        <tr>
          <th class="text-left px-4 py-3 text-sm font-medium">Name</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Slug</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Status</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Plan</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Created</th>
          <th class="text-right px-4 py-3 text-sm font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.tenants as tenant}
          <tr class="border-t hover:bg-muted/30">
            <td class="px-4 py-3 font-medium"><a href="/tenants/{tenant.id}" class="hover:underline">{tenant.name}</a></td>
            <td class="px-4 py-3 text-muted-foreground">{tenant.slug}</td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                class:bg-green-100={tenant.status === 'active'}
                class:bg-yellow-100={tenant.status === 'pending'}
                class:bg-red-100={tenant.status === 'suspended'}>
                {tenant.status}
              </span>
            </td>
            <td class="px-4 py-3 capitalize">{tenant.plan}</td>
            <td class="px-4 py-3 text-muted-foreground text-sm">{new Date(tenant.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-3 text-right">
              <a href="/tenants/{tenant.id}" class="text-sm text-primary hover:underline">View</a>
            </td>
          </tr>
        {/each}
        {#if data.tenants.length === 0}
          <tr><td colspan="6" class="px-4 py-8 text-center text-muted-foreground">No tenants found</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
