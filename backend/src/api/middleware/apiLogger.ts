import { Elysia } from 'elysia';
import { createChildLogger } from '../../lib/logger.js';

const log = createChildLogger('api');

export const apiLogger = new Elysia({ name: 'api-logger' })
  .onBeforeHandle(({ request }) => {
    (request as any)._startTime = performance.now();
    log.info({ method: request.method, url: new URL(request.url).pathname }, '→ request');
  })
  .onAfterHandle(({ request, set }) => {
    const duration = Math.round(performance.now() - ((request as any)._startTime || 0));
    log.info(
      {
        method: request.method,
        url: new URL(request.url).pathname,
        status: typeof set.status === 'number' ? set.status : 200,
        duration,
      },
      '← response',
    );
  });
