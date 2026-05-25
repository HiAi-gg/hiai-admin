import type { HiAiPlugin } from './types.js';

export const umamiPlugin: HiAiPlugin = {
  id: 'umami',
  name: 'Umami Analytics',
  version: '1.0.0',
  icon: '📊',
  description: 'Privacy-focused web analytics',
  navGroups: [{ items: [{ label: 'Umami', href: '/analytics/umami', icon: '📊' }] }],
  proxy: { prefix: '/api/umami', target: 'http://localhost:3000', auth: 'api-key' },
};
