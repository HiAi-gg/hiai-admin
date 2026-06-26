<script lang="ts" generics="T extends Record<string, any>">
import { Search } from 'lucide-svelte';
import type { Snippet } from 'svelte';

let {
  data = [],
  columns = [],
  searchPlaceholder = 'Search...',
  onSearch,
  onSort,
  onPageChange,
  page = 1,
  totalPages = 1,
  loading = false,
  emptyMessage = 'No data found',
  actions,
}: {
  data: T[];
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: T) => string;
  }[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  page?: number;
  totalPages?: number;
  loading?: boolean;
  emptyMessage?: string;
  actions?: Snippet<[T]>;
} = $props();

let searchQuery = $state('');
let sortKey = $state('');
let sortDirection = $state<'asc' | 'desc'>('asc');

function handleSearch() {
  onSearch?.(searchQuery);
}

function handleSort(key: string) {
  if (sortKey === key) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key;
    sortDirection = 'asc';
  }
  onSort?.(key, sortDirection);
}
</script>

<div class="space-y-4">
  <div class="flex items-center gap-2">
    <div class="relative flex-1 max-w-sm">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        bind:value={searchQuery}
        onkeydown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder={searchPlaceholder}
        class="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
    <button
      onclick={handleSearch}
      class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
    >
      Search
    </button>
  </div>

  <div class="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
    <table class="w-full caption-bottom text-sm">
      <thead class="border-b border-border bg-muted/30">
        <tr>
          {#each columns as col}
            <th class="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {#if col.sortable}
                <button
                  onclick={() => handleSort(col.key)}
                  class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {col.label}
                  {#if sortKey === col.key}
                    <span class="text-foreground">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  {/if}
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
          {#if actions}
            <th class="h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr>
            <td colspan={columns.length + (actions ? 1 : 0)} class="p-8 text-center text-muted-foreground">
              Loading...
            </td>
          </tr>
        {:else if data.length === 0}
          <tr>
            <td colspan={columns.length + (actions ? 1 : 0)} class="p-8 text-center text-muted-foreground">
              {emptyMessage}
            </td>
          </tr>
        {:else}
          {#each data as row}
            <tr class="border-b border-border last:border-0 transition-colors hover:bg-muted/40">
              {#each columns as col}
                <td class="p-4 align-middle">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              {/each}
              {#if actions}
                <td class="p-4 align-middle">
                  {@render actions(row)}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  {#if totalPages > 1}
    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
      <div class="flex gap-2">
        <button
          onclick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onclick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages}
          class="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  {/if}
</div>
