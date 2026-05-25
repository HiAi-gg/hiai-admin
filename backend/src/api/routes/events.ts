import { Elysia } from 'elysia';

type SSEEvent = {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
};

const clients = new Set<(event: SSEEvent) => void>();

export function broadcastEvent(event: SSEEvent) {
  for (const send of clients) {
    try { send(event); } catch { clients.delete(send); }
  }
}

export const eventsRoutes = new Elysia({ prefix: '/api/events' })
  .get('/', ({ set }) => {
    set.headers['content-type'] = 'text/event-stream';
    set.headers['cache-control'] = 'no-cache';
    set.headers['connection'] = 'keep-alive';
    set.status = 200;

    return new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const send = (event: SSEEvent) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          };
          clients.add(send);
          send({ type: 'connected', data: { message: 'SSE connected' }, timestamp: new Date().toISOString() });
          const heartbeat = setInterval(() => {
            try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { clearInterval(heartbeat); }
          }, 15000);
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }
    );
  });
