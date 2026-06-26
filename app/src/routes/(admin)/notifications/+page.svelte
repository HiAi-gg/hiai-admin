<script lang="ts">
import { persistentNotificationStore } from '$lib/stores/notifications.svelte.js';

let filter = $state<'all' | 'unread'>('all');

async function load() {
  try {
    await persistentNotificationStore.fetch({
      unreadOnly: filter === 'unread',
      limit: 50,
    });
  } catch {
    // store keeps previous state
  }
}

$effect(() => {
  // Re-fetch when filter changes
  void filter;
  load();
});

async function onMarkRead(id: string) {
  try {
    await persistentNotificationStore.markRead(id);
  } catch {
    /* store reverts on failure */
  }
}

async function onMarkAllRead() {
  try {
    await persistentNotificationStore.markAllRead();
  } catch {
    /* store reverts on failure */
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function typeBadgeColor(type: string): string {
  if (type === 'payment_failed') return 'bg-destructive/10 text-destructive';
  if (type === 'tenant_created') return 'bg-success/10 text-success';
  if (type === 'tenant_invite') return 'bg-primary/10 text-primary';
  return 'bg-muted text-muted-foreground';
}

function humanType(type: string): string {
  return type.replace(/_/g, ' ');
}
</script>

<svelte:head><title>Notifications — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Notifications</h1>
      <p class="text-sm text-muted-foreground">
        {persistentNotificationStore.total} total · {persistentNotificationStore.unreadCount} unread
      </p>
    </div>

    <div class="flex items-center gap-2">
      <div class="inline-flex rounded-md border bg-card p-0.5 text-sm">
        <button
          type="button"
          onclick={() => (filter = 'all')}
          class="rounded px-3 py-1 {filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
        >
          All
        </button>
        <button
          type="button"
          onclick={() => (filter = 'unread')}
          class="rounded px-3 py-1 {filter === 'unread' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
        >
          Unread
        </button>
      </div>
      {#if persistentNotificationStore.unreadCount > 0}
        <button
          type="button"
          onclick={onMarkAllRead}
          class="rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted"
        >
          Mark all read
        </button>
      {/if}
    </div>
  </div>

  <div class="rounded-lg border bg-card">
    {#if persistentNotificationStore.loading && persistentNotificationStore.items.length === 0}
      <div class="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
    {:else if persistentNotificationStore.items.length === 0}
      <div class="px-6 py-12 text-center text-sm text-muted-foreground">
        {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
      </div>
    {:else}
      <ul class="divide-y">
        {#each persistentNotificationStore.items as n (n.id)}
          <li>
            <button
              type="button"
              onclick={() => onMarkRead(n.id)}
              class="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors {n.read ? '' : 'bg-primary/5'}"
            >
              <div class="flex items-start gap-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide whitespace-nowrap {typeBadgeColor(n.type)}"
                >
                  {humanType(n.type)}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline justify-between gap-2">
                    <p class="text-sm font-semibold leading-snug">{n.title}</p>
                    <span class="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  {#if n.body}
                    <p class="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  {/if}
                  {#if !n.read}
                    <span class="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
                      Unread
                    </span>
                  {/if}
                </div>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
