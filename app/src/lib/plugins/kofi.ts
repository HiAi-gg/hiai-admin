import type { HiAiPlugin, NavIcon } from './types.js';
import { Coffee } from 'lucide-svelte';

export const kofiPlugin: HiAiPlugin = {
  id: 'kofi',
  name: 'Ko-fi',
  version: '1.0.0',
  icon: Coffee as unknown as NavIcon,
  description: 'Donation and tip integration',
  navGroups: [
    {
      items: [{ label: 'Ko-fi', href: '/integrations/kofi', icon: Coffee as unknown as string }],
    },
  ],
  proxy: { prefix: '/api/kofi', target: 'https://ko-fi.com/api/v1', auth: 'api-key' },
};
