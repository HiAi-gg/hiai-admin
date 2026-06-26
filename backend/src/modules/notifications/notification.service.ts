import { db } from '../../lib/db.js';
import { notifications } from '../../db/schema/index.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { novu } from '../../lib/novu.js';
import { logger } from '../../lib/logger.js';

const log = logger.child({ module: 'notifications' });

export interface SendNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  /** Optional subscriber info — passed to Novu when key is set. */
  subscriber?: { email?: string; firstName?: string; lastName?: string };
}

export interface NotificationListParams {
  userId: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

/**
 * Notification service.
 *
 * Three concerns:
 *  1. Persist every notification in our DB so the UI can list/mark-read
 *     independently of Novu's per-channel delivery state.
 *  2. Best-effort forward to Novu if NOVU_API_KEY is configured.
 *  3. Auto-upsert the subscriber on first send (Novu requires the subscriber
 *     to exist before trigger() will deliver).
 *
 * Never throws on Novu errors — the local row is the source of truth for
 * the UI; Novu is the delivery channel.
 */
export const notificationService = {
  /**
   * Send a notification. Always returns the persisted row, regardless of
   * whether Novu was reachable.
   */
  async send(input: SendNotificationInput): Promise<NotificationDto> {
    const userId = String(input.userId);
    const data = input.data ?? {};

    // 1. Best-effort upsert subscriber in Novu. Failures are logged but don't
    //    block the local write — the UI will still show the notification.
    if (novu.enabled && input.subscriber?.email) {
      await novu.upsertSubscriber({
        subscriberId: userId,
        email: input.subscriber.email,
        firstName: input.subscriber.firstName,
        lastName: input.subscriber.lastName,
        data: { type: input.type },
      });
    }

    // 2. Trigger delivery via Novu. We always store the message id we get
    //    back so mark-as-read can talk to Novu later (when enabled).
    const novuResult = await novu.trigger({
      name: input.type,
      to: { subscriberId: userId },
      payload: {
        title: input.title,
        body: input.body,
        ...data,
      },
    });

    // 3. Persist locally. The row is what the UI queries — even when Novu is
    //    disabled, this is the only place the notification lives.
    const [row] = await db
      .insert(notifications)
      .values({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data,
        novuMessageId: novuResult.messageId ?? null,
      })
      .returning();

    log.info(
      {
        notificationId: row.id,
        userId,
        type: input.type,
        novuDelivered: novuResult.delivered,
      },
      'Notification created',
    );

    return toDto(row);
  },

  /**
   * Convenience: ensure a Novu subscriber exists for a user, without
   * sending a notification. No-op when Novu is disabled.
   */
  async createSubscriber(
    userId: string,
    email?: string,
    name?: string,
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!novu.enabled) {
      return { ok: false, reason: 'novu_disabled' };
    }
    const [firstName, ...rest] = (name ?? '').split(' ');
    return novu.upsertSubscriber({
      subscriberId: String(userId),
      email,
      firstName: firstName || undefined,
      lastName: rest.length ? rest.join(' ') : undefined,
    });
  },

  /**
   * List notifications for a user, newest first. Supports unread-only
   * filtering and pagination.
   */
  async list(params: NotificationListParams): Promise<{
    items: NotificationDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasMore: boolean;
      unreadCount: number;
    };
  }> {
    const { userId, unreadOnly = false, page = 1, limit = 20 } = params;
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));
    const where = and(...conditions);

    const [rows, totalRow, unreadRow] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(notifications).where(where),
      db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
    ]);

    const total = totalRow[0]?.count ?? 0;
    const unreadCount = unreadRow[0]?.count ?? 0;

    return {
      items: rows.map(toDto),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
        unreadCount,
      },
    };
  },

  /**
   * Mark a single notification as read. Calls Novu's mark-as-read endpoint
   * when the notification has a `novuMessageId` and Novu is enabled, but
   * always updates the local row (local is the source of truth).
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationDto | null> {
    const [existing] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);
    if (!existing) return null;

    if (existing.novuMessageId && novu.enabled) {
      await novu.markAsRead(userId, existing.novuMessageId);
    }

    const [row] = await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();
    return row ? toDto(row) : null;
  },

  /**
   * Bulk mark-all-read for a user. Used by the notifications page header.
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .returning({ id: notifications.id });
    return { updated: result.length };
  },
};

function toDto(row: typeof notifications.$inferSelect): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    read: row.read,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
