import type { HiAiPlugin } from './types.js';

export const hiaiStorePlugin: HiAiPlugin = {
  id: 'hiai-store',
  name: 'E-Commerce',
  version: '1.0.0',
  icon: '🛒',
  description: 'Multi-tenant e-commerce platform',
  navGroups: [
    {
      label: 'E-Commerce',
      items: [
        { label: 'Dashboard', href: '/shop/dashboard', icon: '📊' },
        { label: 'Products', href: '/shop/products', icon: '📦' },
        { label: 'Orders', href: '/shop/orders', icon: '🧾' },
        { label: 'Payments', href: '/shop/payments', icon: '💳' },
        { label: 'Promotions', href: '/shop/promotions', icon: '🏷️' },
        { label: 'Shipping', href: '/shop/shipping', icon: '🚚' },
        { label: 'Analytics', href: '/shop/analytics', icon: '📈' },
      ],
    },
  ],
  proxy: { prefix: '/api/shop', target: 'http://localhost:50400', auth: 'jwt' },
};
