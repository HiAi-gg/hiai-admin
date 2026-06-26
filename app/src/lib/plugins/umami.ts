import type { HiAiPlugin, NavIcon } from './types.js';
import { BarChart3 } from 'lucide-svelte';

const umamiTarget =
  (typeof process !== 'undefined' && process.env?.UMAMI_URL) || 'http://localhost:3005';
const umamiWebsiteId = (typeof process !== 'undefined' && process.env?.UMAMI_WEBSITE_ID) || '';

export const umamiPlugin: HiAiPlugin = {
  id: 'umami',
  name: 'Umami Analytics',
  version: '1.0.0',
  icon: BarChart3 as unknown as NavIcon,
  description: 'Privacy-focused web analytics',
  navGroups: [
    {
      items: [
        { label: 'Umami', href: '/analytics/umami', icon: BarChart3 as unknown as string },
      ],
    },
  ],
  proxy: { prefix: '/api/umami', target: umamiTarget, auth: 'api-key' },
};

export const umamiConfig = {
  url: umamiTarget,
  websiteId: umamiWebsiteId,
};
