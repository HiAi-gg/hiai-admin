import type { HiAiPlugin } from './types.js';
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
  icon: Smartphone,
  description: 'Social media content planning and publishing',
  navGroups: [
    {
      label: 'Social Media',
      icon: Smartphone,
      items: [
        { label: 'Dashboard', href: '/social/dashboard', icon: BarChart3 },
        { label: 'Accounts', href: '/social/accounts', icon: User },
        { label: 'Posts', href: '/social/posts', icon: FileText },
        { label: 'Campaigns', href: '/social/campaigns', icon: Megaphone },
        {
          label: 'Content Plans',
          href: '/social/content-plans',
          icon: ClipboardList,
        },
        { label: 'Templates', href: '/social/templates', icon: File },
        { label: 'Analytics', href: '/social/analytics', icon: TrendingUp },
      ],
    },
  ],
  proxy: {
    prefix: '/api/social',
    target: 'http://localhost:50300',
    auth: 'jwt',
  },
};
