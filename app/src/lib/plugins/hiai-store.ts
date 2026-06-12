import type { HiAiPlugin } from './types.js';

export const hiaiStorePlugin: HiAiPlugin = {
  id: 'hiai-store',
  name: 'E-Commerce',
  version: '0.0.0',
  icon: '🛒',
  description: 'Multi-tenant e-commerce platform (coming soon)',
  navGroups: [
    {
      label: 'E-Commerce',
      items: [
        { label: 'Dashboard', href: '/shop/dashboard', icon: '📊', comingSoon: true },
        { label: 'Products', href: '/shop/products', icon: '📦', comingSoon: true },
        { label: 'Orders', href: '/shop/orders', icon: '🧾', comingSoon: true },
        { label: 'Payments', href: '/shop/payments', icon: '💳', comingSoon: true },
        { label: 'Promotions', href: '/shop/promotions', icon: '🏷️', comingSoon: true },
        { label: 'Shipping', href: '/shop/shipping', icon: '🚚', comingSoon: true },
        { label: 'Analytics', href: '/shop/analytics', icon: '📈', comingSoon: true },
      ],
    },
  ],
  proxy: { prefix: '/api/shop', target: 'http://localhost:50400', auth: 'jwt' },
};
