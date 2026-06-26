<script lang="ts">
import { enhance } from '$app/forms';
import { domainStatusTone, statusLabel, type DomainRecord } from '$lib/sites/domains.js';

let { data, form } = $props();

const domains = $derived(data.domains ?? []);

const statusTints: Record<ReturnType<typeof domainStatusTone>, string> = {
  ok: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
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
    <div class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
      {#if form.added}
        Domain <code class="rounded bg-muted px-1">{form.added}</code> added. Follow the steps below to activate it.
      {:else if form.verified}
        Domain <code class="rounded bg-muted px-1">{form.verified}</code> verified successfully.
      {/if}
    </div>
  {/if}

  <!-- DNS Setup Instructions (beginner-friendly) -->
  <div class="rounded-md border bg-muted/40 p-5">
    <h2 class="text-base font-semibold">How to connect your domain</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      To make <code class="rounded bg-background px-1.5 py-0.5 text-xs">{data.slug}.hiai.gg</code> reachable
      via your own domain (e.g. <code class="rounded bg-background px-1.5 py-0.5 text-xs">www.yourdomain.com</code>),
      add the DNS records below at the company where you bought the domain.
    </p>
    <ol class="mt-4 space-y-3 text-sm">
      <li class="flex gap-3">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >1</span
        >
        <div>
          <p class="font-medium">Sign in to your DNS provider</p>
          <p class="text-xs text-muted-foreground">
            This is the company where you registered your domain (Cloudflare, Namecheap, GoDaddy,
            Google Domains, etc.).
          </p>
        </div>
      </li>
      <li class="flex gap-3">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >2</span
        >
        <div>
          <p class="font-medium">
            Add a CNAME record: <code class="rounded bg-background px-1.5 py-0.5 text-xs">www</code>
            → <code class="rounded bg-background px-1.5 py-0.5 text-xs">{data.slug}.hiai.gg</code>
          </p>
          <p class="text-xs text-muted-foreground">
            Recommended for <code class="rounded bg-background px-1.5 py-0.5 text-xs">www.yourdomain.com</code>.
            Use the proxy/grey-cloud disabled if your provider offers DNS proxying.
          </p>
        </div>
      </li>
      <li class="flex gap-3">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >3</span
        >
        <div>
          <p class="font-medium">
            Or add an A record: <code class="rounded bg-background px-1.5 py-0.5 text-xs">@</code>
            → server IP address
          </p>
          <p class="text-xs text-muted-foreground">
            Use this for the bare domain (<code class="rounded bg-background px-1.5 py-0.5 text-xs">yourdomain.com</code>).
            Ask our support for the current IP if it isn't shown in the table above.
          </p>
        </div>
      </li>
      <li class="flex gap-3">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >4</span
        >
        <div>
          <p class="font-medium">Wait for DNS propagation (5 min — 48 h)</p>
          <p class="text-xs text-muted-foreground">
            Most providers update within 5–30 minutes. TTL can slow this down to up to 48 hours.
          </p>
        </div>
      </li>
      <li class="flex gap-3">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >5</span
        >
        <div>
          <p class="font-medium">Click <span class="text-primary">Verify</span> on your domain</p>
          <p class="text-xs text-muted-foreground">
            We check DNS + SSL. When both pass, the badge turns green and the site goes live.
          </p>
        </div>
      </li>
    </ol>
  </div>

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
