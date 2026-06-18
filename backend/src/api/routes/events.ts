import { Elysia } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

type SSEEvent = {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
};

const clients = new Set<(event: SSEEvent) => void>();

export function broadcastEvent(event: SSEEvent) {
  for (const send of clients) {
    try {
      send(event);
    } catch {
      clients.delete(send);
    }
  }
}

export const eventsRoutes = new Elysia({ prefix: '/api/events' })
  .use(authMiddleware)
  .use(rbacMiddleware)
  .get(
    '/',
    ({ request, set }) => {
      set.headers['content-type'] = 'text/event-stream';
      set.headers['cache-control'] = 'no-cache';
      set.headers.connection = 'keep-alive';
      set.status = 200;

      return new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const send = (event: SSEEvent) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            };
            clients.add(send);
            send({
              type: 'connected',
              data: { message: 'SSE connected' },
              timestamp: new Date().toISOString(),
            });
            let heartbeat: ReturnType<typeof setInterval> | undefined;
            let cleaned = false;
            const cleanup = () => {
              if (cleaned) return;
              cleaned = true;
              if (heartbeat) {
                clearInterval(heartbeat);
                heartbeat = undefined;
              }
              clients.delete(send);
              try {
                controller.close();
              } catch {
                // already closed
              }
            };
            heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
              } catch {
                cleanup();
              }
            }, 15000);

            // Primary disconnect path: incoming request abort signal.
            // request.signal fires when the client disconnects, which is
            // exactly the scenario that previously leaked the interval.
            request.signal.addEventListener('abort', cleanup, { once: true });
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
      );
    },
    { requireSuperAdmin: true },
  );
