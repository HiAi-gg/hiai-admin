<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import { goto } from '$app/navigation';
// biome-ignore lint/correctness/noUnusedImports: used in template
import DataTable from '$lib/components/DataTable.svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import StatusBadge from '$lib/components/StatusBadge.svelte';
import { page } from '$app/state';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

let { data } = $props();

let statusFilter = $state(data.status ?? '');

// Sync local state when URL changes
$effect(() => {
  statusFilter = data.status ?? '';
});

function handleSearch(query: string) {
  const url = new URL(page.url);
  if (query) url.searchParams.set('search', query);
  else url.searchParams.delete('search');
  url.searchParams.set('page', '1');
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

function handlePageChange(p: number) {
  const url = new URL(page.url);
  url.searchParams.set('page', String(p));
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

function applyStatusFilter() {
  const url = new URL(page.url);
  if (statusFilter) url.searchParams.set('status', statusFilter);
  else url.searchParams.delete('status');
  url.searchParams.set('page', '1');
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

function clearStatusFilter() {
  statusFilter = '';
  const url = new URL(page.url);
  url.searchParams.delete('status');
  url.searchParams.set('page', '1');
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (val: string) => 'STATUS',
  },
  { key: 'plan', label: 'Plan', sortable: true },
  {
    key: 'createdAt',
    label: 'Created',
    sortable: true,
    render: (val: string) => (val ? new Date(val).toLocaleDateString() : '—'),
  },
];
</script>

<svelte:head>
  <title>Tenants — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Tenants</h1>
      <p class="text-muted-foreground">All tenants on the platform</p>
    </div>
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      applyStatusFilter();
    }}
    class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
  >
    <div class="w-48">
      <label for="tenant-status" class="block text-xs font-medium text-muted-foreground mb-1">
        Status
      </label>
      <SelectRoot type="single" bind:value={statusFilter}>
        <SelectTrigger class="w-full" id="tenant-status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </SelectRoot>
    </div>
    <div class="flex gap-2">
      <button
        type="submit"
        class="px-4 py-2 rounded bg-primary text-primary-foreground text-sm hover:opacity-90"
      >
        Apply
      </button>
      <button
        type="button"
        onclick={clearStatusFilter}
        class="px-4 py-2 rounded border text-sm hover:bg-accent"
      >
        Clear
      </button>
    </div>
    {#if data.status}
      <span class="text-xs text-muted-foreground self-center">
        Filter: status=<span class="font-mono">{data.status}</span>
      </span>
    {/if}
  </form>

  <DataTable
    data={data.tenants || []}
    {columns}
    searchPlaceholder="Search tenants..."
    onSearch={handleSearch}
    onPageChange={handlePageChange}
    page={data.page}
    totalPages={data.totalPages || 1}
    emptyMessage="No tenants found"
  >
    {#snippet actions(row)}
      <a
        href="/tenants/{row.id}"
        class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs hover:bg-accent"
      >
        View
      </a>
      <a
        href="/tenants/{row.id}/edit"
        class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs hover:bg-accent"
      >
        Edit
      </a>
    {/snippet}
  </DataTable>
</div>
