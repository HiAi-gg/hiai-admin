// Re-export the transient toast store from @hiai/ui (success/error/info pop-ups).
export { notificationStore, type Notification } from '@hiai/ui';

/**
 * Persistent notifications — server-backed (Novu + our `notifications` table).
 *
 * Distinct from `@hiai/ui`'s `notificationStore`, which is a transient toast
 * queue that auto-dismisses after a timeout. The persistent store keeps a
 * cached list of server notifications (loaded via /api/notifications),
 * exposes an unread count for the bell badge, and updates state when the
 * user marks an item as read.
 */

import { api } from '$lib/api.js';

export interface PersistentNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface NotificationListResponse {
  items: PersistentNotification[];
  pagination: NotificationPagination;
}

function createPersistentNotificationStore() {
  let items = $state<PersistentNotification[]>([]);
  let unreadCount = $state(0);
  let total = $state(0);
  let loading = $state(false);
  let lastFetched = $state<number | null>(null);

  async function fetch(opts: { unreadOnly?: boolean; page?: number; limit?: number } = {}) {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (opts.unreadOnly) params.set('unreadOnly', 'true');
      if (opts.page) params.set('page', String(opts.page));
      if (opts.limit) params.set('limit', String(opts.limit));
      const qs = params.toString();
      const path = qs ? `/api/notifications?${qs}` : '/api/notifications';
      const res = await api.get<NotificationListResponse>(path);
      items = res.items;
      unreadCount = res.pagination.unreadCount;
      total = res.pagination.total;
      lastFetched = Date.now();
      return res;
    } finally {
      loading = false;
    }
  }

  async function markRead(id: string) {
    // Optimistic update — flip read=true locally first so the UI feels instant.
    const prev = items;
    items = items.map((n) =>
      n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
    );
    if (unreadCount > 0) unreadCount -= 1;
    try {
      await api.post(`/api/notifications/${id}/read`);
    } catch (err) {
      // Revert on failure
      items = prev;
      unreadCount = items.filter((n) => !n.read).length;
      throw err;
    }
  }

  async function markAllRead() {
    const prev = items;
    const prevUnread = unreadCount;
    items = items.map((n) => (n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }));
    unreadCount = 0;
    try {
      await api.post('/api/notifications/read-all');
    } catch (err) {
      items = prev;
      unreadCount = prevUnread;
      throw err;
    }
  }

  function reset() {
    items = [];
    unreadCount = 0;
    total = 0;
    lastFetched = null;
  }

  return {
    get items() {
      return items;
    },
    get unreadCount() {
      return unreadCount;
    },
    get total() {
      return total;
    },
    get loading() {
      return loading;
    },
    get lastFetched() {
      return lastFetched;
    },
    fetch,
    markRead,
    markAllRead,
    reset,
  };
}

export const persistentNotificationStore = createPersistentNotificationStore();
