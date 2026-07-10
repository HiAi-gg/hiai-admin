<script lang="ts">
import { invalidateAll } from '$app/navigation';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';
// biome-ignore lint/correctness/noUnusedImports: used in template
import DataTable from '$lib/components/DataTable.svelte';
// biome-ignore lint/correctness/noUnusedImports: used in template
import ConfirmModal from '$lib/components/ConfirmModal.svelte';
import { Lock } from 'lucide-svelte';

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean | null;
  permissions: string[];
  createdAt: Date | string;
};

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  roleIds: string[];
};

let { data } = $props();

type Tab = 'roles' | 'matrix' | 'users' | 'permissions';
// biome-ignore lint/correctness/noUnusedVariables: used in template
let activeTab = $state<Tab>('roles');

let apiError = $state<string | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: passed to handlers
let busy = $state(false);

async function apiCall(method: string, url: string, body?: any) {
  busy = true;
  apiError = null;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    await invalidateAll();
    return await res.json().catch(() => ({}));
  } catch (e: any) {
    apiError = e.message;
    throw e;
  } finally {
    busy = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: passed to DataTable
let roles: Role[] = $derived(data.roles);
// biome-ignore lint/correctness/noUnusedVariables: passed to DataTable
let permissions: Permission[] = $derived(data.permissions);
// biome-ignore lint/correctness/noUnusedVariables: passed to DataTable
let users: UserRow[] = $derived(data.users);

// biome-ignore lint/correctness/noUnusedVariables: used in template
let rolePermissionsByResource = $derived(() => {
  const groups: Record<string, Permission[]> = {};
  for (const p of permissions) {
    if (!groups[p.resource]) groups[p.resource] = [];
    groups[p.resource].push(p);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
});

// biome-ignore lint/correctness/noUnusedVariables: used in template
let showCreateRole = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let editingRole = $state<Role | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let matrixEditingRole = $state<Role | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: used in ConfirmModal
let showDeleteRole = $state<Role | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let showCreatePermission = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let showAssignUser = $state<UserRow | null>(null);

let newRoleName = $state('');
let newRoleDescription = $state('');
let newRolePermissionIds = $state<Set<string>>(new Set());

let newPermName = $state('');
let newPermResource = $state('');
let newPermAction = $state('');
let newPermDescription = $state('');

let assignUserRole = $state('');
let matrixSelectedPerms = $state<Set<string>>(new Set());
let matrixSaving = $state(false);

// biome-ignore lint/correctness/noUnusedVariables: used in template
function openCreateRole() {
  newRoleName = '';
  newRoleDescription = '';
  newRolePermissionIds = new Set();
  showCreateRole = true;
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function openEditRole(role: Role) {
  editingRole = role;
  newRoleName = role.name;
  newRoleDescription = role.description || '';
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function openEditPerms(role: Role) {
  matrixEditingRole = role;
  matrixSelectedPerms = new Set(role.permissions);
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function openAssignUser(user: UserRow) {
  showAssignUser = user;
  assignUserRole = '';
}

// biome-ignore lint/correctness/noUnusedVariables: form submit
async function submitCreateRole() {
  if (!newRoleName.trim()) return;
  try {
    await apiCall('POST', '/api/rbac/roles', {
      name: newRoleName.trim(),
      description: newRoleDescription.trim() || undefined,
      permissionIds: Array.from(newRolePermissionIds),
    });
    showCreateRole = false;
  } catch {}
}

// biome-ignore lint/correctness/noUnusedVariables: form submit
async function submitEditRole() {
  if (!editingRole) return;
  try {
    await apiCall('PUT', `/api/rbac/roles/${editingRole.id}`, {
      name: newRoleName.trim() || undefined,
      description: newRoleDescription.trim() || undefined,
    });
    editingRole = null;
  } catch {}
}

// biome-ignore lint/correctness/noUnusedVariables: passed to ConfirmModal
async function submitDeleteRole() {
  if (!showDeleteRole) return;
  try {
    await apiCall('DELETE', `/api/rbac/roles/${showDeleteRole.id}`);
    showDeleteRole = null;
  } catch {}
}

// biome-ignore lint/correctness/noUnusedVariables: form submit
async function submitCreatePermission() {
  if (!newPermName.trim() || !newPermResource.trim() || !newPermAction.trim()) return;
  try {
    await apiCall('POST', '/api/rbac/permissions', {
      name: newPermName.trim(),
      resource: newPermResource.trim(),
      action: newPermAction.trim(),
      description: newPermDescription.trim() || undefined,
    });
    showCreatePermission = false;
    newPermName = newPermResource = newPermAction = newPermDescription = '';
  } catch {}
}

// biome-ignore lint/correctness/noUnusedVariables: checkbox onchange
function toggleMatrixPerm(permId: string) {
  if (!matrixEditingRole) return;
  const next = new Set(matrixSelectedPerms);
  if (next.has(permId)) next.delete(permId);
  else next.add(permId);
  matrixSelectedPerms = next;
}

// biome-ignore lint/correctness/noUnusedVariables: button onclick
async function saveMatrix() {
  if (!matrixEditingRole) return;
  matrixSaving = true;
  try {
    await apiCall('PUT', `/api/rbac/roles/${matrixEditingRole.id}/permissions`, {
      permissionIds: Array.from(matrixSelectedPerms),
    });
    matrixEditingRole = null;
  } catch {
  } finally {
    matrixSaving = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: form submit
async function submitAssignUser() {
  if (!showAssignUser || !assignUserRole) return;
  try {
    await apiCall('POST', `/api/rbac/users/${showAssignUser.id}/roles`, {
      roleId: assignUserRole,
    });
    showAssignUser = null;
  } catch {}
}

// biome-ignore lint/correctness/noUnusedVariables: button onclick
async function revokeRole(user: UserRow, roleId: string) {
  try {
    await apiCall('DELETE', `/api/rbac/users/${user.id}/roles/${roleId}`);
  } catch {}
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function permName(perm: Permission): string {
  return perm.name;
}

function roleName(roleId: string): string {
  return roles.find((r) => r.id === roleId)?.name || roleId;
}

// biome-ignore lint/correctness/noUnusedVariables: passed to DataTable
const roleColumns = [
  { key: 'name', label: 'Role', sortable: true },
  { key: 'description', label: 'Description' },
  { key: 'isSystem', label: 'Type', render: (val: boolean) => (val ? 'system' : 'custom') },
  { key: 'permissions', label: 'Permissions', render: (val: string[]) => val.length.toString() },
  {
    key: 'createdAt',
    label: 'Created',
    render: (val: string) => (val ? new Date(val).toLocaleDateString() : '—'),
  },
];

// biome-ignore lint/correctness/noUnusedVariables: passed to DataTable
const userColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Default Role' },
  {
    key: 'roleIds',
    label: 'Assigned Roles',
    render: (val: string[]) => (val.length ? val.map(roleName).join(', ') : '—'),
  },
];

// biome-ignore lint/correctness/noUnusedVariables: passed to DataTable
const permissionColumns = [
  { key: 'name', label: 'Permission', sortable: true },
  { key: 'resource', label: 'Resource', sortable: true },
  { key: 'action', label: 'Action' },
  { key: 'description', label: 'Description' },
];

// biome-ignore lint/correctness/noUnusedVariables: used in template
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'roles', label: 'Roles', icon: '👑' },
  { id: 'matrix', label: 'Permission Matrix', icon: '🔲' },
  { id: 'users', label: 'User Assignments', icon: '👥' },
  { id: 'permissions', label: 'Permissions', icon: '🔑' },
];
</script>

<svelte:head><title>RBAC Editor — HiAi Admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">RBAC Editor</h1>
      <p class="text-muted-foreground">Manage roles, permissions, and user access</p>
    </div>
  </div>

  {#if apiError}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {apiError}
    </div>
  {/if}

  <div class="border-b">
    <nav class="flex gap-2">
      {#each tabs as tab}
        <button
          onclick={() => (activeTab = tab.id)}
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          class:border-primary={activeTab === tab.id}
          class:text-primary={activeTab === tab.id}
          class:border-transparent={activeTab !== tab.id}
          class:text-muted-foreground={activeTab !== tab.id}
        >
          <span class="mr-1">{tab.icon}</span>{tab.label}
        </button>
      {/each}
    </nav>
  </div>

  {#if activeTab === 'roles'}
    <div class="space-y-4">
      <div class="flex justify-end">
        <button
          onclick={openCreateRole}
          disabled={busy}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          + New Role
        </button>
      </div>
      <DataTable
        data={roles}
        columns={roleColumns}
        emptyMessage="No roles defined"
      >
        {#snippet actions(row: Role)}
          <div class="flex gap-1">
            <button
              onclick={() => openEditPerms(row)}
              class="inline-flex h-7 items-center rounded border border-input bg-background px-2 text-xs hover:bg-accent"
            >
              Permissions
            </button>
            {#if !row.isSystem}
              <button
                onclick={() => openEditRole(row)}
                disabled={busy}
                class="inline-flex h-7 items-center rounded border border-input bg-background px-2 text-xs hover:bg-accent disabled:opacity-50"
              >
                Edit
              </button>
              <button
                onclick={() => (showDeleteRole = row)}
                disabled={busy}
                class="inline-flex h-7 items-center rounded border border-destructive bg-background px-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                Delete
              </button>
            {/if}
          </div>
        {/snippet}
      </DataTable>
    </div>

  {:else if activeTab === 'matrix'}
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        Click a role to edit its permission set. System roles are read-only.
      </p>
      <div class="rounded-md border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50">
            <tr>
              <th class="sticky left-0 z-10 bg-muted/50 px-4 py-2 text-left font-medium">Resource / Action</th>
              {#each roles as role}
                <th class="px-3 py-2 text-center font-medium whitespace-nowrap">
                  <button
                    onclick={() => !role.isSystem && openEditPerms(role)}
                    class:opacity-50={role.isSystem}
                    disabled={role.isSystem || busy}
                    class="hover:underline disabled:cursor-not-allowed"
                  >
                    {role.name}
                    {#if role.isSystem}<Lock class="ml-1 inline h-3.5 w-3.5 text-muted-foreground" />{/if}
                  </button>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rolePermissionsByResource() as [resource, perms]}
              {#each perms as perm, i}
                <tr class="border-t hover:bg-muted/30">
                  {#if i === 0}
                    <td class="sticky left-0 z-10 bg-background px-4 py-2 font-medium" rowspan={perms.length}>
                      <span class="rounded bg-secondary px-2 py-0.5 text-xs">{resource}</span>
                    </td>
                  {/if}
                  <td class="px-4 py-2 text-muted-foreground">{permName(perm)}</td>
                  {#each roles as role}
                    <td class="px-3 py-2 text-center">
                      {#if data.matrix.matrix?.[role.id]?.[perm.id]}
                        <span class="text-green-600 dark:text-green-400">✓</span>
                      {:else}
                        <span class="text-muted-foreground/30">·</span>
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  {:else if activeTab === 'users'}
    <div class="space-y-4">
      <DataTable
        data={users}
        columns={userColumns}
        searchPlaceholder="Search users by name or email..."
        emptyMessage="No users found"
      >
        {#snippet actions(row: UserRow)}
          <div class="flex gap-1">
            <button
              onclick={() => openAssignUser(row)}
              disabled={busy}
              class="inline-flex h-7 items-center rounded border border-input bg-background px-2 text-xs hover:bg-accent disabled:opacity-50"
            >
              + Assign Role
            </button>
          </div>
        {/snippet}
      </DataTable>

      {#if users.length}
        <div class="rounded-md border bg-card">
          <div class="border-b px-4 py-2 text-sm font-medium">Active Role Assignments</div>
          <ul class="divide-y">
            {#each users.filter((u) => u.roleIds.length) as u}
              {#each u.roleIds as rid}
                <li class="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <span class="font-medium">{u.email}</span>
                    <span class="mx-2 text-muted-foreground">→</span>
                    <span class="rounded bg-secondary px-2 py-0.5 text-xs">{roleName(rid)}</span>
                  </div>
                  <button
                    onclick={() => revokeRole(u, rid)}
                    disabled={busy}
                    class="text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </li>
              {/each}
            {/each}
          </ul>
        </div>
      {/if}
    </div>

  {:else if activeTab === 'permissions'}
    <div class="space-y-4">
      <div class="flex justify-end">
        <button
          onclick={() => (showCreatePermission = true)}
          disabled={busy}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          + New Permission
        </button>
      </div>
      <DataTable
        data={permissions}
        columns={permissionColumns}
        emptyMessage="No permissions defined"
      />
    </div>
  {/if}
</div>

{#if showCreateRole}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button
      type="button"
      aria-label="Close"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm"
      onclick={() => (showCreateRole = false)}
    ></button>
    <div class="relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
      <h2 class="text-lg font-semibold">Create Role</h2>
      <div class="mt-4 space-y-3">
        <div>
          <label for="new-role-name" class="text-sm font-medium">Name</label>
          <input
            id="new-role-name"
            type="text"
            bind:value={newRoleName}
            placeholder="e.g. billing_manager"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label for="new-role-desc" class="text-sm font-medium">Description</label>
          <input
            id="new-role-desc"
            type="text"
            bind:value={newRoleDescription}
            placeholder="Short description"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <span class="text-sm font-medium">Initial Permissions</span>
          <div class="mt-2 max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
            {#each permissions as p}
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newRolePermissionIds.has(p.id)}
                  onchange={() => {
                    const next = new Set(newRolePermissionIds);
                    if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                    newRolePermissionIds = next;
                  }}
                />
                <span class="font-mono text-xs">{p.name}</span>
              </label>
            {/each}
          </div>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button
          onclick={() => (showCreateRole = false)}
          class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onclick={submitCreateRole}
          disabled={busy || !newRoleName.trim()}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

{#if editingRole}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button
      type="button"
      aria-label="Close"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm"
      onclick={() => (editingRole = null)}
    ></button>
    <div class="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
      <h2 class="text-lg font-semibold">Edit Role</h2>
      <div class="mt-4 space-y-3">
        <div>
          <label for="edit-role-name" class="text-sm font-medium">Name</label>
          <input
            id="edit-role-name"
            type="text"
            bind:value={newRoleName}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label for="edit-role-desc" class="text-sm font-medium">Description</label>
          <input
            id="edit-role-desc"
            type="text"
            bind:value={newRoleDescription}
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button
          onclick={() => (editingRole = null)}
          class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onclick={submitEditRole}
          disabled={busy}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

{#if matrixEditingRole}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button
      type="button"
      aria-label="Close"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm"
      onclick={() => (matrixEditingRole = null)}
    ></button>
    <div class="relative z-50 flex h-[80vh] w-full max-w-3xl flex-col rounded-lg border bg-background shadow-lg">
      <div class="border-b px-6 py-4">
        <h2 class="text-lg font-semibold">Permissions for <span class="font-mono">{matrixEditingRole.name}</span></h2>
        <p class="text-sm text-muted-foreground">
          {matrixSelectedPerms.size} of {permissions.length} selected
        </p>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-4">
        {#each rolePermissionsByResource() as [resource, perms]}
          <div class="mb-4">
            <div class="mb-2 flex items-center gap-2">
              <span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium">{resource}</span>
              <button
                onclick={() => {
                  const all = perms.every((p) => matrixSelectedPerms.has(p.id));
                  const next = new Set(matrixSelectedPerms);
                  for (const p of perms) {
                    if (all) next.delete(p.id);
                    else next.add(p.id);
                  }
                  matrixSelectedPerms = next;
                }}
                class="text-xs text-primary hover:underline"
              >
                toggle all
              </button>
            </div>
            <div class="grid grid-cols-2 gap-1">
              {#each perms as p}
                <label class="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={matrixSelectedPerms.has(p.id)}
                    onchange={() => toggleMatrixPerm(p.id)}
                  />
                  <span class="font-mono text-xs">{p.name}</span>
                </label>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <div class="flex justify-end gap-3 border-t px-6 py-3">
        <button
          onclick={() => (matrixEditingRole = null)}
          class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onclick={saveMatrix}
          disabled={matrixSaving}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {matrixSaving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showCreatePermission}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button
      type="button"
      aria-label="Close"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm"
      onclick={() => (showCreatePermission = false)}
    ></button>
    <div class="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
      <h2 class="text-lg font-semibold">Create Permission</h2>
      <div class="mt-4 space-y-3">
        <div>
          <label for="new-perm-name" class="text-sm font-medium">Name (resource:action)</label>
          <input
            id="new-perm-name"
            type="text"
            bind:value={newPermName}
            placeholder="e.g. billing:export"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="new-perm-resource" class="text-sm font-medium">Resource</label>
            <input
              id="new-perm-resource"
              type="text"
              bind:value={newPermResource}
              placeholder="e.g. billing"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label for="new-perm-action" class="text-sm font-medium">Action</label>
            <input
              id="new-perm-action"
              type="text"
              bind:value={newPermAction}
              placeholder="e.g. export"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div>
          <label for="new-perm-desc" class="text-sm font-medium">Description</label>
          <input
            id="new-perm-desc"
            type="text"
            bind:value={newPermDescription}
            placeholder="What does this permission allow?"
            class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button
          onclick={() => (showCreatePermission = false)}
          class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onclick={submitCreatePermission}
          disabled={busy || !newPermName.trim() || !newPermResource.trim() || !newPermAction.trim()}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showAssignUser}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button
      type="button"
      aria-label="Close"
      class="fixed inset-0 bg-background/80 backdrop-blur-sm"
      onclick={() => (showAssignUser = null)}
    ></button>
    <div class="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
      <h2 class="text-lg font-semibold">Assign Role</h2>
      <p class="text-sm text-muted-foreground">
        For <span class="font-mono">{showAssignUser.email}</span>
      </p>
      <div class="mt-4">
        <label for="assign-user-role" class="text-sm font-medium">Role</label>
        <SelectRoot type="single" bind:value={assignUserRole} >
          <SelectTrigger class="mt-1 w-full" id="assign-user-role">
            <SelectValue placeholder="\u2014 select role \u2014" />
          </SelectTrigger>
          <SelectContent>
            {#each roles.filter((r) => !showAssignUser?.roleIds.includes(r.id)) as r}
              <SelectItem value={r.id}>{r.name}</SelectItem>
            {/each}
          </SelectContent>
        </SelectRoot>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button
          onclick={() => (showAssignUser = null)}
          class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          Cancel
        </button>
        <button
          onclick={submitAssignUser}
          disabled={busy || !assignUserRole}
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Assign
        </button>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  open={!!showDeleteRole}
  title="Delete Role"
  message={showDeleteRole ? `Are you sure you want to delete "${showDeleteRole.name}"? This will revoke the role from all assigned users.` : ''}
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={submitDeleteRole}
  onCancel={() => (showDeleteRole = null)}
/>
