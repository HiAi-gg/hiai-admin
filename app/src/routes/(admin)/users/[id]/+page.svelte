<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  let { data } = $props();
  let activeTab = $state('profile');
  let showRoleModal = $state(false);
  let selectedRole = $state(data.user?.role || 'viewer');

  const roles = [
    { value: 'super_admin', label: 'Super Admin', description: 'Full platform access' },
    { value: 'tenant_admin', label: 'Tenant Admin', description: 'Manage assigned tenants' },
    { value: 'editor', label: 'Editor', description: 'Edit content within tenants' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
  ];

  async function updateRole() {
    await fetch(`/api/users/${data.user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole })
    });
    showRoleModal = false;
    window.location.reload();
  }

  async function revokeSession(sessionId: string) {
    await fetch(`/api/users/${data.user.id}/sessions/${sessionId}`, { method: 'DELETE' });
    window.location.reload();
  }
</script>

<svelte:head><title>{data.user?.name || 'User'} — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">{data.user?.name}</h1>
      <p class="text-muted-foreground">{data.user?.email} · <span class="capitalize">{data.user?.role?.replace('_', ' ')}</span></p>
    </div>
    <button onclick={() => showRoleModal = true} class="px-4 py-2 border rounded-md text-sm hover:bg-accent">Change Role</button>
  </div>

  <div class="flex gap-4 border-b">
    {#each ['profile', 'roles', 'tenants', 'sessions'] as tab}
      <button onclick={() => activeTab = tab} class="pb-2 px-1 text-sm transition-colors"
        class:border-b-2={activeTab === tab}
        class:border-primary={activeTab === tab}
        class:font-medium={activeTab === tab}
        class:text-muted-foreground={activeTab !== tab}
      >{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
    {/each}
  </div>

  {#if activeTab === 'profile'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-lg border bg-card p-6">
        <h3 class="font-semibold mb-4">Profile Information</h3>
        <div class="space-y-4">
          <div><label class="text-sm text-muted-foreground">Name</label><p class="font-medium">{data.user?.name}</p></div>
          <div><label class="text-sm text-muted-foreground">Email</label><p class="font-medium">{data.user?.email}</p></div>
          <div><label class="text-sm text-muted-foreground">Role</label><p class="font-medium capitalize">{data.user?.role?.replace('_', ' ')}</p></div>
          <div>
            <label class="text-sm text-muted-foreground">2FA Status</label>
            <p class="font-medium">
              {#if data.user?.twoFactorEnabled}
                <span class="text-success">Enabled</span>
              {:else}
                <span class="text-warning">Not enabled</span>
              {/if}
            </p>
          </div>
          <div><label class="text-sm text-muted-foreground">Last Login</label><p class="font-medium">{data.user?.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleString() : 'Never'}</p></div>
          <div><label class="text-sm text-muted-foreground">Created</label><p class="font-medium">{data.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : 'N/A'}</p></div>
        </div>
      </div>
      <div class="rounded-lg border bg-card p-6">
        <h3 class="font-semibold mb-4">Activity Summary</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 rounded bg-muted/50"><span class="text-sm">Total actions</span><span class="font-bold">{data.user?.activityCount || 0}</span></div>
          <div class="flex items-center justify-between p-3 rounded bg-muted/50"><span class="text-sm">Last active</span><span class="font-medium">{data.user?.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleDateString() : 'Never'}</span></div>
          <div class="flex items-center justify-between p-3 rounded bg-muted/50"><span class="text-sm">Tenant access</span><span class="font-bold">{data.user?.tenantAccess?.length || 0}</span></div>
        </div>
      </div>
    </div>

  {:else if activeTab === 'roles'}
    <div class="rounded-lg border bg-card p-6">
      <h3 class="font-semibold mb-4">Role & Permissions</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each roles as role}
          <div class="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md"
            class:border-primary={data.user?.role === role.value}
            class:bg-primary/5={data.user?.role === role.value}
            onclick={() => { selectedRole = role.value; showRoleModal = true; }}
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{role.label}</span>
              {#if data.user?.role === role.value}
                <span class="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Current</span>
              {/if}
            </div>
            <p class="text-sm text-muted-foreground mt-1">{role.description}</p>
          </div>
        {/each}
      </div>
    </div>

  {:else if activeTab === 'tenants'}
    <div class="rounded-lg border bg-card overflow-hidden">
      <div class="p-4 border-b"><h3 class="font-semibold">Tenant Access</h3></div>
      <table class="w-full text-sm">
        <thead><tr class="border-b bg-muted/50">
          <th class="p-3 text-left font-medium text-muted-foreground">Tenant</th>
          <th class="p-3 text-left font-medium text-muted-foreground">Role</th>
          <th class="p-3 text-left font-medium text-muted-foreground">Granted</th>
        </tr></thead>
        <tbody>
          {#each (data.user?.tenantAccess || []) as access}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="p-3"><a href="/tenants/{access.tenantId}" class="font-medium hover:text-primary">{access.tenantName || access.tenantId}</a></td>
              <td class="p-3 capitalize">{access.role}</td>
              <td class="p-3 text-muted-foreground">{access.createdAt ? new Date(access.createdAt).toLocaleDateString() : 'N/A'}</td>
            </tr>
          {:else}
            <tr><td colspan="3" class="p-8 text-center text-muted-foreground">No tenant access assigned</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

  {:else if activeTab === 'sessions'}
    <div class="rounded-lg border bg-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Active Sessions</h3>
        <span class="text-sm text-muted-foreground">{(data.user?.sessions || []).length} active</span>
      </div>
      <div class="space-y-3">
        {#each (data.user?.sessions || []) as session}
          <div class="flex items-center justify-between p-3 rounded-md border">
            <div>
              <p class="text-sm font-medium">{session.userAgent || 'Unknown device'}</p>
              <p class="text-xs text-muted-foreground">IP: {session.ipAddress || 'Unknown'} · Created: {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}</p>
            </div>
            <button onclick={() => revokeSession(session.id)} class="text-xs text-destructive hover:underline">Revoke</button>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground text-center py-4">No active sessions</p>
        {/each}
      </div>
    </div>
  {/if}
</div>

{#if showRoleModal}
  <ConfirmModal
    title="Change User Role"
    message="Change {data.user?.name}'s role to {selectedRole.replace('_', ' ')}?"
    confirmLabel="Change Role"
    onConfirm={updateRole}
    onCancel={() => showRoleModal = false}
  />
{/if}
