import type { HiAiPlugin } from './types.js';

const umamiTarget =
  (typeof process !== 'undefined' && process.env?.UMAMI_URL) || 'http://localhost:3005';
const umamiWebsiteId = (typeof process !== 'undefined' && process.env?.UMAMI_WEBSITE_ID) || '';

export const umamiPlugin: HiAiPlugin = {
  id: 'umami',
  name: 'Umami Analytics',
  version: '1.0.0',
  icon: '📊',
  description: 'Privacy-focused web analytics',
  navGroups: [{ items: [{ label: 'Umami', href: '/analytics/umami', icon: '📊' }] }],
  proxy: { prefix: '/api/umami', target: umamiTarget, auth: 'api-key' },
};

export const umamiConfig = {
  url: umamiTarget,
  websiteId: umamiWebsiteId,
};
