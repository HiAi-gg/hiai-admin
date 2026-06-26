import type { HiAiPlugin, NavIcon } from './types.js';
import {
  BarChart3,
  ClipboardList,
  File,
  FileText,
  Megaphone,
  Smartphone,
  TrendingUp,
  User,
} from 'lucide-svelte';

export const hiaiPostPlugin: HiAiPlugin = {
  id: 'hiai-post',
  name: 'Social Media',
  version: '1.0.0',
  icon: Smartphone as unknown as NavIcon,
  description: 'Social media content planning and publishing',
  navGroups: [
    {
      label: 'Social Media',
      items: [
        { label: 'Dashboard', href: '/social/dashboard', icon: BarChart3 as unknown as string },
        { label: 'Accounts', href: '/social/accounts', icon: User as unknown as string },
        { label: 'Posts', href: '/social/posts', icon: FileText as unknown as string },
        { label: 'Campaigns', href: '/social/campaigns', icon: Megaphone as unknown as string },
        {
          label: 'Content Plans',
          href: '/social/content-plans',
          icon: ClipboardList as unknown as string,
        },
        { label: 'Templates', href: '/social/templates', icon: File as unknown as string },
        { label: 'Analytics', href: '/social/analytics', icon: TrendingUp as unknown as string },
      ],
    },
  ],
  proxy: {
    prefix: '/api/social',
    target: 'http://localhost:50300',
    auth: 'jwt',
  },
};
