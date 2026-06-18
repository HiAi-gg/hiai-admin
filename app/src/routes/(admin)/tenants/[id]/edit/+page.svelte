<script lang="ts">
let { data } = $props();

let name = $state(data.tenant?.name ?? '');
let slug = $state(data.tenant?.slug ?? '');
let email = $state(data.tenant?.email ?? '');
let plan = $state(data.tenant?.plan ?? 'free');
let status = $state(data.tenant?.status ?? 'active');
let loading = $state(false);
let error: string = $state('');

async function handleSubmit(event: Event) {
  event.preventDefault();
  loading = true;
  error = '';
  try {
    const res = await fetch(`/api/tenants/${data.tenant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, email, plan, status }),
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
    window.location.href = `/tenants/${data.tenant.id}`;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to update tenant';
  } finally {
    loading = false;
  }
}
</script>

<svelte:head><title>Edit Tenant — hiai-admin</title></svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Edit Tenant</h1>
    <a href="/tenants/{data.tenant.id}" class="text-sm text-muted-foreground hover:underline">← Back to detail</a>
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
      <label for="slug" class="block text-sm font-medium mb-1">Slug</label>
      <input
        id="slug"
        type="text"
        bind:value={slug}
        required
        pattern="[a-z0-9-]+"
        class="w-full px-3 py-2 border rounded-lg"
      />
      <p class="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, and hyphens only.</p>
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

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="plan" class="block text-sm font-medium mb-1">Plan</label>
        <select id="plan" bind:value={plan} class="w-full px-3 py-2 border rounded-lg">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div>
        <label for="status" class="block text-sm font-medium mb-1">Status</label>
        <select id="status" bind:value={status} class="w-full px-3 py-2 border rounded-lg">
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
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
        href="/tenants/{data.tenant.id}"
        class="px-6 py-2 border rounded-lg text-sm hover:bg-accent"
      >
        Cancel
      </a>
    </div>
  </form>
</div>
