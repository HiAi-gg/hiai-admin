import type { HiAiPlugin, NavIcon } from './types.js';
import {
  BarChart3,
  CreditCard,
  Package,
  Receipt,
  ShoppingCart,
  Tag,
  TrendingUp,
  Truck,
} from 'lucide-svelte';

export const hiaiStorePlugin: HiAiPlugin = {
  id: 'hiai-store',
  name: 'E-Commerce',
  version: '1.0.0',
  icon: ShoppingCart as unknown as NavIcon,
  description: 'Multi-tenant e-commerce platform',
  navGroups: [
    {
      label: 'E-Commerce',
      items: [
        { label: 'Dashboard', href: '/shop/dashboard', icon: BarChart3 as unknown as string },
        { label: 'Products', href: '/shop/products', icon: Package as unknown as string },
        { label: 'Orders', href: '/shop/orders', icon: Receipt as unknown as string },
        { label: 'Payments', href: '/shop/payments', icon: CreditCard as unknown as string },
        { label: 'Promotions', href: '/shop/promotions', icon: Tag as unknown as string },
        { label: 'Shipping', href: '/shop/shipping', icon: Truck as unknown as string },
        { label: 'Analytics', href: '/shop/analytics', icon: TrendingUp as unknown as string },
      ],
    },
  ],
  proxy: { prefix: '/api/shop', target: 'http://localhost:50400', auth: 'jwt' },
};
