import type { HiAiPlugin } from './types.js';

export const hiaiPostPlugin: HiAiPlugin = {
  id: 'hiai-post',
  name: 'Social Media',
  version: '0.0.0',
  icon: '📱',
  description: 'Social media content planning and publishing (coming soon)',
  navGroups: [
    {
      label: 'Social Media',
      items: [
        { label: 'Dashboard', href: '/social/dashboard', icon: '📊', comingSoon: true },
        { label: 'Accounts', href: '/social/accounts', icon: '🔗', comingSoon: true },
        { label: 'Posts', href: '/social/posts', icon: '📝', comingSoon: true },
        { label: 'Campaigns', href: '/social/campaigns', icon: '🎯', comingSoon: true },
        { label: 'Content Plans', href: '/social/content-plans', icon: '📋', comingSoon: true },
        { label: 'Templates', href: '/social/templates', icon: '📄', comingSoon: true },
        { label: 'Analytics', href: '/social/analytics', icon: '📈', comingSoon: true },
      ],
    },
  ],
  proxy: { prefix: '/api/social', target: 'http://localhost:50300', auth: 'jwt' },
};
