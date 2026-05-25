import type { HiAiPlugin } from './types.js';

export const hiaiPostPlugin: HiAiPlugin = {
  id: 'hiai-post',
  name: 'Social Media',
  version: '1.0.0',
  icon: '📱',
  description: 'Social media content planning and publishing',
  navGroups: [{
    label: 'Social Media',
    items: [
      { label: 'Dashboard', href: '/social/dashboard', icon: '📊' },
      { label: 'Accounts', href: '/social/accounts', icon: '🔗' },
      { label: 'Posts', href: '/social/posts', icon: '📝' },
      { label: 'Campaigns', href: '/social/campaigns', icon: '🎯' },
      { label: 'Content Plans', href: '/social/content-plans', icon: '📋' },
      { label: 'Templates', href: '/social/templates', icon: '📄' },
      { label: 'Analytics', href: '/social/analytics', icon: '📈' },
    ],
  }],
  proxy: { prefix: '/api/social', target: 'http://localhost:50300', auth: 'jwt' },
};
