<script lang="ts">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@hiai/ui/components/ui/select/index';

let name = $state('');
let slug = $state('');
let email = $state('');
let plan = $state('free');
// biome-ignore lint/correctness/noUnusedVariables: used in template
let loading = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let error: string = $state('');

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function handleSubmit(event: Event) {
  event.preventDefault();
  loading = true;
  error = '';
  try {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, email, plan }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error);
    }
    window.location.href = '/tenants';
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to create tenant';
  } finally {
    loading = false;
  }
}
</script>

<svelte:head><title>New Tenant — hiai-admin</title></svelte:head>

<div class="max-w-2xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Create New Tenant</h1>
  {#if error}<div class="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">{error}</div>{/if}
  <form onsubmit={handleSubmit} class="space-y-4">
    <div><label class="block text-sm font-medium mb-1">Name</label><input type="text" bind:value={name} required class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Slug</label><input type="text" bind:value={slug} required pattern="[a-z0-9-]+" class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Owner Email</label><input type="email" bind:value={email} required class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Plan</label>
      <SelectRoot type="single" bind:value={plan} >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Select plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="pro">Pro ($29/mo)</SelectItem>
          <SelectItem value="enterprise">Enterprise ($99/mo)</SelectItem>
        </SelectContent>
      </SelectRoot>
    </div>
    <button type="submit" disabled={loading} class="bg-primary text-primary-foreground px-6 py-2 rounded-lg disabled:opacity-50">{loading ? 'Creating...' : 'Create Tenant'}</button>
  </form>
</div>
