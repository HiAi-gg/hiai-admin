<script lang="ts">
import { goto } from '$app/navigation';
import DataTable from '$lib/components/DataTable.svelte';

let { data } = $props();

function handleSearch(query: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('search', query);
  url.searchParams.set('page', '1');
  goto(url.toString());
}

function handlePageChange(page: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', String(page));
  goto(url.toString());
}

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'two_factor_enabled', label: '2FA', render: (val: boolean) => (val ? '✅' : '❌') },
  {
    key: 'last_login_at',
    label: 'Last Login',
    render: (val: string) => (val ? new Date(val).toLocaleString() : 'Never'),
  },
  {
    key: 'created_at',
    label: 'Created',
    render: (val: string) => new Date(val).toLocaleDateString(),
  },
];
</script>

<svelte:head>
  <title>Users — HiAi Admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Users</h1>
      <p class="text-muted-foreground">Manage platform users and roles</p>
    </div>
  </div>

  <DataTable
    data={data.users.items || []}
    {columns}
    searchPlaceholder="Search users..."
    onSearch={handleSearch}
    onPageChange={handlePageChange}
    page={data.page}
    totalPages={data.users.totalPages || 1}
    emptyMessage="No users found"
  >
    {#snippet actions(row)}
      <a
        href="/users/{row.id}"
        class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs hover:bg-accent"
      >
        View
      </a>
    {/snippet}
  </DataTable>
</div>
