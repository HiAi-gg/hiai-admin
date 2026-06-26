<script lang="ts">
import { onMount } from 'svelte';
import { Coffee } from 'lucide-svelte';

let { data } = $props();

let webhookUrl = $state('');
let verificationToken = $state('');
let saving = $state(false);
let loadingConfig = $state(true);
let saveResult = $state<{ kind: 'success' | 'error'; message: string } | null>(null);

const kofiPageUrl = $derived(data.kofiPageUrl);

const snippet = $derived(
  kofiPageUrl
    ? `<script src='https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'><\/script>\n<script>\n  kofiWidgetOverlay.draw('${kofiPageUrl.replace(/^https?:\/\//, '')}', {\n    'type': 'floating-chat',\n    'floating-chat.donateButton.text': 'Support me',\n    'floating-chat.donateButton.background-color': '#00b9fe',\n    'floating-chat.donateButton.text-color': '#fff'\n  });\n<\/script>`
    : '',
);

// biome-ignore lint/correctness/noUnusedVariables: button onclick
async function handleSave() {
  saving = true;
  saveResult = null;
  try {
    const res = await fetch('/api/integrations/kofi/config', {
      method: 'PUT',
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

onMount(async () => {
  try {
    const res = await fetch('/api/integrations?type=kofi&page=1&limit=1');
    if (res.ok) {
      const body = await res.json();
      const kofi = body?.integrations?.find?.((i: { type: string }) => i.type === 'kofi');
      const config = kofi?.config as { webhookUrl?: string } | undefined;
      if (config?.webhookUrl) webhookUrl = config.webhookUrl;
    }
  } catch {
    // best-effort — keep form empty if backend is unreachable
  } finally {
    loadingConfig = false;
  }
});
</script>

<svelte:head><title>Ko-fi Integration — hiai-admin</title></svelte:head>

<div class="space-y-6 max-w-2xl">
  <div>
    <h1 class="text-2xl font-bold flex items-center gap-2">
      <Coffee class="h-6 w-6" aria-hidden="true" />
      Ko-fi Integration
    </h1>
    <p class="text-sm text-muted-foreground">Configure webhook + verification token</p>
  </div>

  <div class="rounded-lg border bg-card p-6 space-y-4">
    <div>
      <label for="kofi-webhook" class="text-sm font-medium">Webhook URL</label>
      <input
        id="kofi-webhook"
        bind:value={webhookUrl}
        class="w-full mt-1 rounded border px-3 py-2 text-sm bg-background"
        placeholder="https://your-domain.com/api/kofi/webhook"
        disabled={loadingConfig}
      />
      <p class="mt-1 text-xs text-muted-foreground">
        Public URL Ko-fi will POST donation events to.
      </p>
    </div>
    <div>
      <label for="kofi-token" class="text-sm font-medium">Verification Token</label>
      <input
        id="kofi-token"
        bind:value={verificationToken}
        type="password"
        class="w-full mt-1 rounded border px-3 py-2 text-sm bg-background"
        disabled={loadingConfig}
      />
      <p class="mt-1 text-xs text-muted-foreground">
        Set in your Ko-fi.com webhooks dashboard. Never sent back to the browser after save.
      </p>
    </div>
    <button
      onclick={handleSave}
      disabled={saving || loadingConfig}
      class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
    >
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

  <div class="rounded-lg border bg-card p-6 space-y-3">
    <h2 class="font-semibold">Widget preview</h2>
    <p class="text-sm text-muted-foreground">
      Paste the snippet below into your site's <code class="font-mono">&lt;body&gt;</code> to render
      the floating Ko-fi support button. The widget script is loaded from Ko-fi's CDN.
    </p>
    {#if kofiPageUrl}
      <pre class="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto">{snippet}</pre>
    {:else}
      <p class="text-sm text-amber-600">
        Set <code class="font-mono">KOFI_PAGE_URL</code> (e.g.
        <code class="font-mono">https://ko-fi.com/yourname</code>) in your
        <code class="font-mono">.env</code> to enable the widget snippet.
      </p>
    {/if}
  </div>
</div>
