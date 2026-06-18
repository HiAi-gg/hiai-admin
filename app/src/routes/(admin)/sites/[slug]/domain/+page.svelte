<script lang="ts">
import { enhance } from '$app/forms';
import { domainStatusTone, statusLabel, type DomainRecord } from '$lib/sites/domains.js';
import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

let { data, form } = $props();

const breadcrumbs = $derived([
  { label: 'Sites', href: '/sites' },
  { label: data.slug, href: `/sites/${data.slug}` },
  { label: 'Domain' },
]);

const domains = $derived(data.domains ?? []);

const statusTints: Record<ReturnType<typeof domainStatusTone>, string> = {
  ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'bg-destructive/10 text-destructive',
};

const statusClassForRecord = (record: DomainRecord): string => {
  // Show worst status: if any status is error, show error; else if any is pending, show pending.
  if (record.dnsStatus === 'error' || record.sslStatus === 'error') {
    return statusTints.error;
  }
  if (record.dnsStatus === 'pending' || record.sslStatus === 'pending') {
    return statusTints.pending;
  }
  return statusTints.ok;
};
</script>

<svelte:head>
  <title>Domain — {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <Breadcrumbs items={breadcrumbs} />

  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Domains</h1>
      <p class="text-sm text-muted-foreground">
        {data.slug} · {domains.length} domain{domains.length === 1 ? '' : 's'}
      </p>
    </div>
    <a href={`/sites/${data.slug}`} class="text-sm text-muted-foreground hover:underline">
      ← Back to site
    </a>
  </div>

  {#if form?.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
      {#if form.added}
        Domain <code class="rounded bg-muted px-1">{form.added}</code> added. Verify it to activate.
      {:else if form.verified}
        Domain <code class="rounded bg-muted px-1">{form.verified}</code> verified successfully.
      {/if}
    </div>
  {/if}

  {#if data.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {data.error}
    </div>
  {/if}

  <!-- Add Domain Form -->
  <form method="POST" action="?/addDomain" use:enhance class="flex gap-2 rounded-md border bg-muted/40 p-4">
    <label class="flex flex-1 items-center gap-2">
      <span class="text-sm font-medium">Add domain:</span>
      <input
        type="text"
        name="domain"
        placeholder="example.com"
        class="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        required
      />
    </label>
    <button
      type="submit"
      class="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
    >
      + Add
    </button>
  </form>

  <!-- Domains List -->
  {#if domains.length === 0}
    <div class="rounded-md border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
      No domains configured. Add your first domain to get started.
    </div>
  {:else}
    <div class="overflow-x-auto rounded-md border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th class="px-4 py-3">Domain</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">DNS</th>
            <th class="px-4 py-3">SSL</th>
            <th class="px-4 py-3">CNAME</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each domains as domain (domain.domain)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-3 font-mono text-sm">{domain.domain}</td>
              <td class="px-4 py-3">
                <span
                  class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClassForRecord(domain)}`}
                >
                  {domain.verified ? 'Verified' : 'Pending'}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTints[domainStatusTone(domain.dnsStatus)]}`}
                >
                  {statusLabel(domain.dnsStatus)}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTints[domainStatusTone(domain.sslStatus)]}`}
                >
                  {statusLabel(domain.sslStatus)}
                </span>
              </td>
              <td class="px-4 py-3">
                {#if domain.cname}
                  <code class="rounded bg-muted px-2 py-1 text-xs">{domain.cname}</code>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right">
                {#if !domain.verified && domain.id}
                  <form method="POST" action="?/verify" use:enhance class="inline">
                    <input type="hidden" name="domainId" value={domain.id} />
                    <input type="hidden" name="domain" value={domain.domain} />
                    <button
                      type="submit"
                      class="text-primary hover:underline"
                    >
                      Verify
                    </button>
                  </form>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
