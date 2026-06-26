import type { HiAiPlugin, NavIcon } from './types.js';
import {
  BarChart3,
  Bell,
  CircleDot,
  Radio,
  Satellite,
  ScrollText,
  Tv,
} from 'lucide-svelte';

/**
 * hiai-observe plugin manifest.
 *
 * Embeds HiAi Observe (Sentry + Uptime Kuma + Dozzle + LLM-tracing)
 * into hiai-admin as a proxied vertical module on the /api/observe/* prefix.
 *
 * The observe backend runs on http://localhost:8001 (configurable via
 * HIAI_OBSERVE_URL). Auth: the admin injects the project's API key
 * (ho_*) on each proxied request — observe is a single-tenant-per-key system.
 *
 * For multi-tenant scoping, the admin forwards `?tenant_id=` (alias for
 * `?projectId=`) so the admin's tenant ID maps 1:1 onto an observe project.
 * See docs/EMBED.md → Scope Parameters.
 */
export const hiaiObservePlugin: HiAiPlugin = {
  id: 'hiai-observe',
  name: 'Observe',
  version: '1.0.0',
  icon: Radio as unknown as NavIcon,
  description: 'Observability dashboard — errors, uptime, alerts, logs, traces',
  navGroups: [
    {
      label: 'Observe',
      items: [
        { label: 'Overview', href: '/observe', icon: BarChart3 as unknown as string },
        { label: 'Monitors', href: '/observe/monitors', icon: CircleDot as unknown as string },
        { label: 'Alerts', href: '/observe/alerts', icon: Bell as unknown as string },
        { label: 'Status Page', href: '/observe/status', icon: Tv as unknown as string },
        { label: 'Logs', href: '/observe/logs', icon: ScrollText as unknown as string },
        { label: 'Traces', href: '/observe/traces', icon: Satellite as unknown as string },
      ],
    },
  ],
  // Observe is read-mostly from the admin shell; uses api-key auth
  // (admin holds an observe API key per project/tenant).
  proxy: {
    prefix: '/api/observe',
    target: process.env.HIAI_OBSERVE_URL ?? 'http://localhost:8001',
    auth: 'api-key',
    rateLimit: { requests: 600, window: 60 }, // 10 req/s — observe dashboard polls
  },
};
