<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { Download } from 'lucide-svelte';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

// biome-ignore lint/correctness/noUnusedVariables: typed but unused in this view
let { data } = $props();
let actionFilter = $state(page.url.searchParams.get('action') || '');
let resourceFilter = $state(page.url.searchParams.get('resource') || '');
let dateFrom = $state(page.url.searchParams.get('from') || '');
let dateTo = $state(page.url.searchParams.get('to') || '');

// biome-ignore lint/correctness/noUnusedVariables: used in template
function applyFilters() {
  const params = new URLSearchParams();
  if (actionFilter) params.set('action', actionFilter);
  if (resourceFilter) params.set('resource', resourceFilter);
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo) params.set('to', dateTo);
  goto(`?${params.toString()}`);
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function exportCSV() {
  const params = new URLSearchParams({ format: 'csv' });
  if (actionFilter) params.set('action', actionFilter);
  if (resourceFilter) params.set('resource', resourceFilter);
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo) params.set('to', dateTo);
  window.open(`/api/audit/export?${params.toString()}`, '_blank');
}
</script>

<svelte:head><title>Audit Logs — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Audit Logs</h1>
    <button onclick={exportCSV} class="inline-flex items-center gap-2 px-4 py-2 rounded border text-sm hover:bg-muted">
      <Download class="h-3.5 w-3.5" />
      Export CSV
    </button>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3 items-end">
    <div>
      <label class="text-xs text-muted-foreground mb-1 block">Action</label>
      <SelectRoot type="single" bind:value={actionFilter}>
        <SelectTrigger class="w-40">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All actions</SelectItem>
          <SelectItem value="create">Create</SelectItem>
          <SelectItem value="update">Update</SelectItem>
          <SelectItem value="delete">Delete</SelectItem>
          <SelectItem value="login">Login</SelectItem>
          <SelectItem value="suspend">Suspend</SelectItem>
        </SelectContent>
      </SelectRoot>
    </div>
    <div>
      <label class="text-xs text-muted-foreground mb-1 block">Resource</label>
      <SelectRoot type="single" bind:value={resourceFilter}>
        <SelectTrigger class="w-40">
          <SelectValue placeholder="All resources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All resources</SelectItem>
          <SelectItem value="tenant">Tenant</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="billing">Billing</SelectItem>
          <SelectItem value="settings">Settings</SelectItem>
        </SelectContent>
      </SelectRoot>
    </div>
    <div>
      <label class="text-xs text-muted-foreground mb-1 block">From</label>
      <input type="date" bind:value={dateFrom} class="px-3 py-1.5 border rounded text-sm bg-background" />
    </div>
    <div>
      <label class="text-xs text-muted-foreground mb-1 block">To</label>
      <input type="date" bind:value={dateTo} class="px-3 py-1.5 border rounded text-sm bg-background" />
    </div>
    <button onclick={applyFilters} class="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:opacity-90">Apply</button>
  </div>

  <!-- Table -->
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

  <!-- Pagination -->
  {#if data.pagination && data.pagination.pages > 1}
    <div class="flex justify-center gap-2">
      {#each Array.from({ length: data.pagination.pages }, (_, i) => i + 1) as p}
        <a href="?page={p}" class="px-3 py-1 rounded border text-sm {p === data.pagination.page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}">{p}</a>
      {/each}
    </div>
  {/if}
</div>
