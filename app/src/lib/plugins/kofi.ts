import type { HiAiPlugin } from './types.js';

export const kofiPlugin: HiAiPlugin = {
  id: 'kofi',
  name: 'Ko-fi',
  version: '1.0.0',
  icon: '☕',
  description: 'Donation and tip integration',
  navGroups: [{ items: [{ label: 'Ko-fi', href: '/integrations/kofi', icon: '☕' }] }],
  proxy: { prefix: '/api/kofi', target: 'https://ko-fi.com/api/v1', auth: 'api-key' },
};
