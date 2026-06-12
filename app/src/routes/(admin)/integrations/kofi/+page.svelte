<script lang="ts">
let webhookUrl = $state('');
let verificationToken = $state('');
// biome-ignore lint/correctness/noUnusedVariables: used in template
let saving = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let saveResult = $state<{ kind: 'success' | 'error'; message: string } | null>(null);

// biome-ignore lint/correctness/noUnusedVariables: button onclick
async function handleSave() {
  saving = true;
  saveResult = null;
  try {
    const res = await fetch('/api/integrations/kofi/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl, verificationToken }),
    });
    if (res.ok) {
      saveResult = { kind: 'success', message: 'Configuration saved successfully.' };
    } else {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? `Save failed (${res.status})`;
      saveResult = { kind: 'error', message };
    }
  } catch (err) {
    saveResult = {
      kind: 'error',
      message: err instanceof Error ? `Network error: ${err.message}` : 'Network error',
    };
  } finally {
    saving = false;
  }
}
</script>

<svelte:head><title>Ko-fi Integration — hiai-admin</title></svelte:head>

<div class="space-y-6 max-w-2xl">
  <h1 class="text-2xl font-bold">☕ Ko-fi Integration</h1>
  <div class="rounded-lg border bg-card p-6 space-y-4">
    <div>
      <label class="text-sm font-medium">Webhook URL</label>
      <input bind:value={webhookUrl} class="w-full mt-1 rounded border px-3 py-2 text-sm bg-background" placeholder="https://your-domain.com/api/kofi/webhook" />
    </div>
    <div>
      <label class="text-sm font-medium">Verification Token</label>
      <input bind:value={verificationToken} type="password" class="w-full mt-1 rounded border px-3 py-2 text-sm bg-background" />
    </div>
    <button onclick={handleSave} disabled={saving} class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50">
      {saving ? 'Saving...' : 'Save'}
    </button>
    {#if saveResult}
      <p
        class="text-sm mt-2 {saveResult.kind === 'success' ? 'text-green-600' : 'text-red-600'}"
        role="status"
        aria-live="polite"
      >
        {saveResult.message}
      </p>
    {/if}
  </div>
</div>
