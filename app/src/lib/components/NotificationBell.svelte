<script lang="ts">
import { Bell } from 'lucide-svelte';
import { persistentNotificationStore } from '$lib/stores/notifications.svelte.js';

let open = $state(false);
let panelEl = $state<HTMLDivElement | null>(null);
let buttonEl = $state<HTMLButtonElement | null>(null);

async function toggle() {
  if (!open) {
    try {
      await persistentNotificationStore.fetch({ limit: 10 });
    } catch {
      // Bell keeps working without the list — badge still shows count.
    }
  }
  open = !open;
}

async function refresh() {
  try {
    await persistentNotificationStore.fetch({ limit: 10 });
  } catch {
    /* keep prior state */
  }
}

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

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
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

// Close on outside click.
$effect(() => {
  if (!open) return;
  function onDocClick(ev: MouseEvent) {
    const target = ev.target as Node;
    if (panelEl?.contains(target) || buttonEl?.contains(target)) return;
    open = false;
  }
  document.addEventListener('mousedown', onDocClick);
  return () => document.removeEventListener('mousedown', onDocClick);
});

// Close on Escape.
$effect(() => {
  if (!open) return;
  function onKey(ev: KeyboardEvent) {
    if (ev.key === 'Escape') open = false;
  }
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
});
</script>

<div class="relative">
  <button
    bind:this={buttonEl}
    type="button"
    onclick={toggle}
    class="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    aria-label="Notifications"
    aria-haspopup="true"
    aria-expanded={open}
  >
    <Bell class="h-5 w-5" />
    {#if persistentNotificationStore.unreadCount > 0}
      <span
        class="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center"
        aria-label={`${persistentNotificationStore.unreadCount} unread`}
      >
        {persistentNotificationStore.unreadCount > 99 ? '99+' : persistentNotificationStore.unreadCount}
      </span>
    {/if}
  </button>

  {#if open}
    <div
      bind:this={panelEl}
      role="dialog"
      aria-label="Notifications"
      class="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-lg border bg-card shadow-lg z-50"
    >
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h3 class="text-sm font-semibold">Notifications</h3>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={refresh}
            disabled={persistentNotificationStore.loading}
            class="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Refresh"
          >
            {persistentNotificationStore.loading ? 'Loading…' : 'Refresh'}
          </button>
          {#if persistentNotificationStore.unreadCount > 0}
            <button
              type="button"
              onclick={onMarkAllRead}
              class="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          {/if}
        </div>
      </div>

      <div class="max-h-[28rem] overflow-y-auto">
        {#if persistentNotificationStore.items.length === 0 && !persistentNotificationStore.loading}
          <div class="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        {:else if persistentNotificationStore.loading && persistentNotificationStore.items.length === 0}
          <div class="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        {:else}
          <ul class="divide-y">
            {#each persistentNotificationStore.items as n (n.id)}
              <li>
                <button
                  type="button"
                  onclick={() => onMarkRead(n.id)}
                  class="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors {n.read ? 'opacity-70' : 'bg-primary/5'}"
                  aria-label={`Notification: ${n.title}`}
                >
                  <div class="flex items-start gap-2">
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide {typeBadgeColor(n.type)}"
                    >
                      {humanType(n.type)}
                    </span>
                    <span class="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>
                  <p class="mt-1 text-sm font-medium leading-snug">{n.title}</p>
                  {#if n.body}
                    <p class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="border-t px-4 py-2 text-center">
        <a href="/notifications" class="text-xs text-primary hover:underline">
          View all notifications
        </a>
      </div>
    </div>
  {/if}
</div>
