<script lang="ts">
  let webhookUrl = $state('');
  let verificationToken = $state('');
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
    <button class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Save</button>
  </div>
</div>
