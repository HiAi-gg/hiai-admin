<script lang="ts">
import { invalidateAll } from '$app/navigation';

let { data } = $props();
// biome-ignore lint/correctness/noUnusedVariables: used in template
let saving = $state(false);
let saveMessage = $state('');

// --- Logo upload state ---
const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB
const ACCEPTED_LOGO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/x-icon',
];
let logoFile = $state<File | null>(null);
let logoPreview = $state<string | null>(null);
let uploadingLogo = $state(false);
let logoMessage = $state('');
const existingLogoUrl = $derived<string | null>(
  (data.settings?.settings ?? data.settings?.items ?? []).find?.(
    (s: { id: string }) => s.id === 'logo_url',
  )?.value ?? null,
);

function onLogoSelected(event: Event) {
  logoMessage = '';
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    logoFile = null;
    logoPreview = null;
    return;
  }
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    logoMessage = 'Unsupported image type. Use PNG, JPEG, WebP, SVG, AVIF, or ICO.';
    target.value = '';
    return;
  }
  if (file.size > MAX_LOGO_BYTES) {
    logoMessage = `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB; max 1 MB).`;
    target.value = '';
    return;
  }
  logoFile = file;
  if (logoPreview) URL.revokeObjectURL(logoPreview);
  logoPreview = URL.createObjectURL(file);
}

async function uploadLogo() {
  if (!logoFile) {
    logoMessage = 'Choose a logo image first.';
    return;
  }
  uploadingLogo = true;
  logoMessage = '';
  try {
    const form = new FormData();
    form.append('file', logoFile);
    const res = await fetch('/api/settings/logo', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to upload logo');
    }
    logoMessage = 'Logo uploaded';
    await invalidateAll();
    setTimeout(() => (logoMessage = ''), 3000);
  } catch (err) {
    logoMessage = err instanceof Error ? err.message : 'Failed to upload logo';
  } finally {
    uploadingLogo = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
const sections = [
  {
    title: 'General',
    settings: [
      {
        key: 'platform_name',
        label: 'Platform Name',
        description: 'Display name for the HiAi platform',
        type: 'text',
        value: data.settings?.platform_name || 'HiAi',
      },
      {
        key: 'platform_url',
        label: 'Platform URL',
        description: 'Base URL for the admin panel',
        type: 'text',
        value: data.settings?.platform_url || 'http://localhost:50200',
      },
      {
        key: 'default_timezone',
        label: 'Default Timezone',
        description: 'Default timezone for new tenants',
        type: 'select',
        options: [
          'UTC',
          'US/Eastern',
          'US/Pacific',
          'Europe/London',
          'Europe/Berlin',
          'Asia/Tokyo',
        ],
        value: data.settings?.default_timezone || 'UTC',
      },
      {
        key: 'default_currency',
        label: 'Default Currency',
        description: 'Default currency for new stores',
        type: 'select',
        options: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
        value: data.settings?.default_currency || 'USD',
      },
    ],
  },
  {
    title: 'Billing',
    settings: [
      {
        key: 'trial_days',
        label: 'Trial Period (days)',
        description: 'Free trial duration for new tenants',
        type: 'number',
        value: data.settings?.trial_days || 14,
      },
      {
        key: 'grace_period_days',
        label: 'Grace Period (days)',
        description: 'Days after payment failure before suspension',
        type: 'number',
        value: data.settings?.grace_period_days || 7,
      },
      {
        key: 'platform_fee_percent',
        label: 'Platform Fee (%)',
        description: 'Commission on tenant transactions',
        type: 'number',
        value: data.settings?.platform_fee_percent || 5,
      },
    ],
  },
  {
    title: 'Security',
    settings: [
      {
        key: 'require_2fa',
        label: 'Require 2FA for Admins',
        description: 'Force all admin users to enable 2FA',
        type: 'toggle',
        value: data.settings?.require_2fa || false,
      },
      {
        key: 'session_timeout_minutes',
        label: 'Session Timeout (minutes)',
        description: 'Auto-logout after inactivity',
        type: 'number',
        value: data.settings?.session_timeout_minutes || 60,
      },
      {
        key: 'max_login_attempts',
        label: 'Max Login Attempts',
        description: 'Lock account after N failed attempts',
        type: 'number',
        value: data.settings?.max_login_attempts || 5,
      },
    ],
  },
  {
    title: 'Rate Limits',
    settings: [
      {
        key: 'rate_limit_auth',
        label: 'Auth Endpoints',
        description: 'Requests per 15 minutes for auth routes',
        type: 'number',
        value: data.settings?.rate_limit_auth || 5,
      },
      {
        key: 'rate_limit_api',
        label: 'API Endpoints',
        description: 'Requests per minute for authenticated API',
        type: 'number',
        value: data.settings?.rate_limit_api || 300,
      },
      {
        key: 'rate_limit_public',
        label: 'Public Endpoints',
        description: 'Requests per minute for public routes',
        type: 'number',
        value: data.settings?.rate_limit_public || 100,
      },
    ],
  },
];

async function saveSetting(key: string, value: any) {
  saving = true;
  saveMessage = '';
  try {
    const res = await fetch(`/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error('Failed to save');
    saveMessage = 'Settings saved successfully';
    setTimeout(() => (saveMessage = ''), 3000);
  } catch (e: any) {
    saveMessage = `Error: ${e.message}`;
  } finally {
    saving = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function handleInput(key: string, event: Event) {
  const target = event.target as HTMLInputElement;
  saveSetting(key, target.type === 'number' ? Number(target.value) : target.value);
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function handleToggle(key: string, current: boolean) {
  saveSetting(key, !current);
}
</script>

<svelte:head>
  <title>Settings — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Platform Settings</h1>
      <p class="text-muted-foreground">Configure global platform behavior</p>
    </div>
    {#if saveMessage}
      <div class="text-sm px-3 py-1.5 rounded-md" class:text-success={!saveMessage.startsWith('Error')} class:text-destructive={saveMessage.startsWith('Error')} class:bg-muted={true}>
        {saveMessage}
      </div>
    {/if}
  </div>

  {#each sections as section}
    <div class="rounded-lg border bg-card">
      <div class="p-4 border-b">
        <h2 class="text-lg font-semibold">{section.title}</h2>
      </div>
      <div class="divide-y">
        {#each section.settings as setting}
          <div class="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <div class="flex-1 mr-4">
              <div class="font-medium text-sm">{setting.label}</div>
              <div class="text-xs text-muted-foreground">{setting.description}</div>
            </div>
            <div class="flex-shrink-0">
              {#if setting.type === 'toggle'}
                <button
                  onclick={() => handleToggle(setting.key, setting.value)}
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  class:bg-primary={setting.value}
                  class:bg-muted={!setting.value}
                  disabled={saving}
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                    class:translate-x-6={setting.value}
                    class:translate-x-1={!setting.value}
                  ></span>
                </button>
              {:else if setting.type === 'select'}
                <select
                  value={setting.value}
                  onchange={(e) => saveSetting(setting.key, (e.target as HTMLSelectElement).value)}
                  class="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={saving}
                >
                  {#each setting.options || [] as opt}
                    <option value={opt} selected={opt === setting.value}>{opt}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type={setting.type}
                  value={setting.value}
                  onchange={(e) => handleInput(setting.key, e)}
                  class="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={saving}
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <div class="rounded-lg border bg-card">
    <div class="p-4 border-b">
      <h2 class="text-lg font-semibold">Branding</h2>
      <p class="text-xs text-muted-foreground">
        Upload the platform logo. Stored in object storage under <code>logos/</code> and exposed
        as the <code>logo_url</code> setting.
      </p>
    </div>
    <div class="space-y-4 p-4">
      <div class="flex items-center gap-4">
        {#if logoPreview}
          <img
            src={logoPreview}
            alt="Logo preview"
            class="h-16 max-w-[16rem] rounded-md border bg-background object-contain p-2"
          />
        {:else if existingLogoUrl}
          <img
            src={existingLogoUrl}
            alt="Current logo"
            class="h-16 max-w-[16rem] rounded-md border bg-background object-contain p-2"
          />
        {:else}
          <div
            class="h-16 w-32 rounded-md border border-dashed bg-muted/30 flex items-center justify-center text-xs text-muted-foreground"
          >
            No logo
          </div>
        {/if}
        <div class="flex-1 space-y-1">
          <div class="text-sm font-medium">Platform logo</div>
          <div class="text-xs text-muted-foreground">
            PNG, JPEG, WebP, SVG, AVIF, or ICO. Max 1 MB.
          </div>
          {#if existingLogoUrl}
            <div class="text-xs text-muted-foreground truncate">
              Current URL: <code class="break-all">{existingLogoUrl}</code>
            </div>
          {/if}
        </div>
      </div>
      <div class="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <label class="flex-1">
          <span class="sr-only">Choose logo image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif,image/x-icon"
            onchange={onLogoSelected}
            class="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
          />
        </label>
        <div class="flex items-center gap-3">
          {#if logoMessage}
            <span
              class="text-xs"
              class:text-success={!logoMessage.startsWith('Unsupported') &&
                !logoMessage.startsWith('Image too large') &&
                !logoMessage.startsWith('Choose') &&
                !logoMessage.startsWith('Failed')}
              class:text-destructive={logoMessage.startsWith('Unsupported') ||
                logoMessage.startsWith('Image too large') ||
                logoMessage.startsWith('Failed')}
            >
              {logoMessage}
            </span>
          {/if}
          <button
            type="button"
            onclick={uploadLogo}
            disabled={!logoFile || uploadingLogo}
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {uploadingLogo ? 'Uploading…' : 'Upload logo'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
