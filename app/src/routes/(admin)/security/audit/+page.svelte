<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Audit Logs — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Audit Logs</h1>

  <div class="rounded-lg border bg-card overflow-hidden">
    <table class="w-full">
      <thead class="bg-muted/50">
        <tr>
          <th class="text-left px-4 py-3 text-sm font-medium">Time</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Actor</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Action</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Resource</th>
          <th class="text-left px-4 py-3 text-sm font-medium">IP</th>
        </tr>
      </thead>
      <tbody>
        {#each data.logs as log}
          <tr class="border-t hover:bg-muted/30">
            <td class="px-4 py-3 text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
            <td class="px-4 py-3 text-sm">{log.actorEmail || log.actorId}</td>
            <td class="px-4 py-3 text-sm font-mono">{log.action}</td>
            <td class="px-4 py-3 text-sm">{log.resource}{log.resourceId ? `/${log.resourceId}` : ''}</td>
            <td class="px-4 py-3 text-sm text-muted-foreground">{log.ipAddress}</td>
          </tr>
        {/each}
        {#if data.logs.length === 0}
          <tr><td colspan="5" class="px-4 py-8 text-center text-muted-foreground">No audit logs found</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
