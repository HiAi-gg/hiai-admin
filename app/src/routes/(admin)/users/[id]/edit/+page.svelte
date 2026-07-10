<script lang="ts">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

let { data } = $props();

let name = $state(data.user?.name ?? '');
let email = $state(data.user?.email ?? '');
let role = $state(data.user?.role ?? 'viewer');
let loading = $state(false);
let error: string = $state('');

async function handleSubmit(event: Event) {
  event.preventDefault();
  loading = true;
  error = '';
  try {
    const res = await fetch(`/api/users/${data.user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    if (!res.ok) {
      const d = await res.json();
      const fieldErrors = d.details?.fieldErrors as
        | Record<string, string[] | undefined>
        | undefined;
      const details = fieldErrors
        ? Object.entries(fieldErrors)
            .map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`)
            .join('; ')
        : d.error;
      throw new Error(details);
    }
    window.location.href = `/users/${data.user.id}`;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to update user';
  } finally {
    loading = false;
  }
}
</script>

<svelte:head><title>Edit User — hiai-admin</title></svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Edit User</h1>
    <a href="/users/{data.user.id}" class="text-sm text-muted-foreground hover:underline">← Back to detail</a>
  </div>

  {#if error}
    <div class="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label for="name" class="block text-sm font-medium mb-1">Name</label>
      <input
        id="name"
        type="text"
        bind:value={name}
        required
        minlength="1"
        maxlength="200"
        class="w-full px-3 py-2 border rounded-lg"
      />
    </div>

    <div>
      <label for="email" class="block text-sm font-medium mb-1">Email</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        required
        class="w-full px-3 py-2 border rounded-lg"
      />
    </div>

    <div>
      <label for="role" class="block text-sm font-medium mb-1">Role</label>
      <SelectRoot type="single" bind:value={role} >
        <SelectTrigger class="w-full" id="role">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">Viewer</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
          <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
          <SelectItem value="super_admin">Super Admin</SelectItem>
        </SelectContent>
      </SelectRoot>
      <p class="text-xs text-muted-foreground mt-1">Super Admin grants full platform access.</p>
    </div>

    <div class="flex gap-2 pt-2">
      <button
        type="submit"
        disabled={loading}
        class="bg-primary text-primary-foreground px-6 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
      <a
        href="/users/{data.user.id}"
        class="px-6 py-2 border rounded-lg text-sm hover:bg-accent"
      >
        Cancel
      </a>
    </div>
  </form>
</div>
