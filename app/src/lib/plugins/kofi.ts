import type { HiAiPlugin } from './types.js';
import { Coffee } from 'lucide-svelte';

export const kofiPlugin: HiAiPlugin = {
  id: 'kofi',
  name: 'Ko-fi',
  version: '1.0.0',
  icon: Coffee,
  description: 'Donation and tip integration',
  navGroups: [
    { icon: Coffee, items: [{ label: 'Ko-fi', href: '/integrations/kofi', icon: Coffee }] },
  ],
  proxy: { prefix: '/api/kofi', target: 'https://ko-fi.com/api/v1', auth: 'api-key' },
};
