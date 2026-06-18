<script lang="ts">
import { enhance } from '$app/forms';
import { untrack } from 'svelte';
import DataTable from '$lib/components/DataTable.svelte';
import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
import { formatAmount, type Donation, type KofiConfig } from '$lib/sites/kofi.js';

interface PageData {
  slug: string;
  config: KofiConfig;
  donations: Donation[];
  error?: string;
}

let { data, form } = $props<{ data: PageData; form: any }>();

const breadcrumbs = $derived([
  { label: 'Sites', href: '/sites' },
  { label: data.slug, href: `/sites/${data.slug}` },
  { label: 'Ko-fi' },
]);

let config = $state<KofiConfig>(untrack(() => data.config));
let donations = $state<Donation[]>(untrack(() => data.donations ?? []));

// Re-fill form values on validation error
$effect(() => {
  if (form?.values) {
    config = form.values;
  }
});

const donationColumns = [
  {
    key: 'from',
    label: 'From',
    sortable: false,
  },
  {
    key: 'amount',
    label: 'Amount',
    sortable: false,
    render: (value: string, row: Donation) => formatAmount(row),
  },
  {
    key: 'message',
    label: 'Message',
    sortable: false,
  },
  {
    key: 'createdAt',
    label: 'Date',
    sortable: false,
    render: (value: string) => {
      if (!value) return '—';
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    },
  },
];

function formatDate(v: string): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
</script>

<svelte:head>
  <title>Ko-fi — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-8">
  <Breadcrumbs items={breadcrumbs} />

  <!-- Config Section -->
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Ko-fi Integration</h1>
        <p class="text-sm text-muted-foreground">
          {data.slug} · Configure Ko-fi webhook and manage donations
        </p>
      </div>
    </div>

    {#if form?.error}
      <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
        {form.error}
      </div>
    {/if}
    {#if form?.success}
      <div class="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400 mb-6">
        Ko-fi configuration saved successfully.
      </div>
    {/if}

    {#if data.error}
      <div class="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 mb-6">
        {data.error}
      </div>
    {/if}

    <div class="rounded-lg border bg-card shadow-sm p-6 space-y-6">
      <form
        method="POST"
        action="?/saveConfig"
        use:enhance={() => {
          return async ({ update }) => {
            await update();
          };
        }}
        class="space-y-6"
      >
        <!-- Enable Ko-fi -->
        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            id="enabled"
            name="enabled"
            checked={config.enabled}
            onchange={(e) => {
              config.enabled = (e.target as HTMLInputElement).checked;
            }}
            class="h-4 w-4 rounded border-input bg-background text-primary"
          />
          <label for="enabled" class="text-sm font-medium">Enable Ko-fi Integration</label>
        </div>

        <!-- Webhook URL -->
        <div class="space-y-2">
          <label for="webhookUrl" class="text-sm font-medium">Webhook URL</label>
          <input
            type="text"
            id="webhookUrl"
            name="webhookUrl"
            placeholder="https://example.com/webhook"
            value={config.webhookUrl}
            onchange={(e) => {
              config.webhookUrl = (e.target as HTMLInputElement).value;
            }}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p class="text-xs text-muted-foreground">
            The URL where Ko-fi will send donation webhooks (must start with http:// or https://)
          </p>
        </div>

        <!-- Verification Token -->
        <div class="space-y-2">
          <label for="verificationToken" class="text-sm font-medium">Verification Token</label>
          <input
            type="password"
            id="verificationToken"
            name="verificationToken"
            placeholder="Your Ko-fi verification token"
            value={config.verificationToken}
            onchange={(e) => {
              config.verificationToken = (e.target as HTMLInputElement).value;
            }}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p class="text-xs text-muted-foreground">
            The secret token from your Ko-fi settings (displayed as password for security)
          </p>
        </div>

        <button
          type="submit"
          class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
        >
          Save Configuration
        </button>
      </form>
    </div>
  </div>

  <!-- Donations Section -->
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-bold mb-1">Recent Donations</h2>
      <p class="text-sm text-muted-foreground">
        {#if donations.length === 0}
          No donation tracking available
        {:else}
          Showing {donations.length} donation{donations.length === 1 ? '' : 's'}
        {/if}
      </p>
    </div>

    {#if donations.length === 0}
      <div class="rounded-md border border-dashed px-4 py-12 text-center">
        <p class="text-sm text-muted-foreground mb-2">
          Donations are not tracked in this system.
        </p>
        <p class="text-xs text-muted-foreground">
          Ko-fi webhooks are configured via the integration settings above. A dedicated donations table is a planned future feature.
        </p>
      </div>
    {:else}
      <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th class="px-4 py-3">From</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Message</th>
              <th class="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {#each donations as donation (donation.id)}
              <tr class="border-b last:border-0 hover:bg-muted/30">
                <td class="px-4 py-3 font-medium">{donation.from}</td>
                <td class="px-4 py-3 font-medium text-green-600 dark:text-green-400">{formatAmount(donation)}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {donation.message || '—'}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{formatDate(donation.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
