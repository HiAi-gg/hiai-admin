<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';

let { data } = $props();

let search = $state(data.search ?? '');
let role = $state(data.role ?? '');

$effect(() => {
  search = data.search ?? '';
  role = data.role ?? '';
});

function applyFilters() {
  const url = new URL(page.url);
  if (search) {
    url.searchParams.set('search', search);
  } else {
    url.searchParams.delete('search');
  }
  if (role) {
    url.searchParams.set('role', role);
  } else {
    url.searchParams.delete('role');
  }
  url.searchParams.set('page', '1');
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

function clearFilters() {
  search = '';
  role = '';
  const url = new URL(page.url);
  url.searchParams.delete('search');
  url.searchParams.delete('role');
  url.searchParams.set('page', '1');
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

function handleSubmit(event: Event) {
  event.preventDefault();
  applyFilters();
}

function goToPage(p: number) {
  const url = new URL(page.url);
  url.searchParams.set('page', String(p));
  goto(url.toString(), { keepFocus: true, noScroll: true });
}

const users = data.users?.items ?? data.users ?? [];
const pagination = {
  page: data.users?.page ?? data.page ?? 1,
  totalPages: data.users?.totalPages ?? 1,
  total: data.users?.total ?? users.length,
};
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

  <form
    onsubmit={handleSubmit}
    class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
  >
    <div class="flex-1 min-w-[200px]">
      <label for="user-search" class="block text-xs font-medium text-muted-foreground mb-1">
        Search
      </label>
      <input
        id="user-search"
        type="search"
        bind:value={search}
        placeholder="Name or email…"
        class="w-full px-3 py-2 border rounded-lg text-sm bg-background"
      />
    </div>
    <div class="w-48">
      <label for="user-role" class="block text-xs font-medium text-muted-foreground mb-1">
        Role
      </label>
      <select
        id="user-role"
        bind:value={role}
        class="w-full px-3 py-2 border rounded-lg text-sm bg-background"
      >
        <option value="">All</option>
        <option value="super_admin">Super Admin</option>
        <option value="tenant_admin">Tenant Admin</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
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
        onclick={clearFilters}
        class="px-4 py-2 rounded border text-sm hover:bg-accent"
      >
        Clear
      </button>
    </div>
  </form>

  <div class="rounded-lg border bg-card overflow-hidden">
    <table class="w-full">
      <thead class="bg-muted/50">
        <tr>
          <th class="text-left px-4 py-3 text-sm font-medium">Name</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Email</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Role</th>
          <th class="text-left px-4 py-3 text-sm font-medium">2FA</th>
          <th class="text-left px-4 py-3 text-sm font-medium">Last Login</th>
          <th class="text-right px-4 py-3 text-sm font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each users as user (user.id)}
          <tr class="border-t hover:bg-muted/30">
            <td class="px-4 py-3 font-medium">
              <a href="/users/{user.id}" class="hover:underline">{user.name}</a>
            </td>
            <td class="px-4 py-3 text-muted-foreground">{user.email}</td>
            <td class="px-4 py-3 capitalize">
              {(user.role ?? 'viewer').replace('_', ' ')}
            </td>
            <td class="px-4 py-3">
              {user.twoFactorEnabled || user.two_factor_enabled ? '✅' : '❌'}
            </td>
            <td class="px-4 py-3 text-muted-foreground text-sm">
              {user.lastLoginAt || user.last_login_at
                ? new Date(user.lastLoginAt || user.last_login_at).toLocaleString()
                : 'Never'}
            </td>
            <td class="px-4 py-3 text-right space-x-3">
              <a
                href="/users/{user.id}/edit"
                class="text-sm text-muted-foreground hover:underline">Edit</a
              >
              <a href="/users/{user.id}" class="text-sm text-primary hover:underline">View</a>
            </td>
          </tr>
        {/each}
        {#if users.length === 0}
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">No users found</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  {#if pagination.totalPages > 1}
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          onclick={() => goToPage(pagination.page - 1)}
          disabled={pagination.page <= 1}
          class="px-3 py-1.5 rounded border text-sm hover:bg-accent disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onclick={() => goToPage(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          class="px-3 py-1.5 rounded border text-sm hover:bg-accent disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  {/if}
</div>
