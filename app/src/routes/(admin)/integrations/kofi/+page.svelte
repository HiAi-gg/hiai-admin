<script lang="ts">
  let webhookUrl = $state('');
  let verificationToken = $state('');
  let saving = $state(false);
  let saveResult = $state('');

  async function handleSave() {
    saving = true;
    saveResult = '';
    try {
      const res = await fetch('/api/integrations/kofi/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, verificationToken }),
      });
      if (res.ok) {
        saveResult = 'Saved!';
      } else {
        saveResult = 'Error saving';
      }
    } catch {
      saveResult = 'Network error';
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
    <button onclick={handleSave} disabled={saving} class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">
      {saving ? 'Saving...' : 'Save'}
    </button>
    {#if saveResult}
      <p class="text-sm mt-2">{saveResult}</p>
    {/if}
  </div>
</div>
