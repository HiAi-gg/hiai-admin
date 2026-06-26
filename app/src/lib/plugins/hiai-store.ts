import type { HiAiPlugin } from './types.js';
import {
  BarChart3,
  ChartBar,
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
  icon: ShoppingCart,
  description: 'Multi-tenant e-commerce platform',
  navGroups: [
    {
      label: 'E-Commerce',
      icon: ShoppingCart,
      items: [
        { label: 'Dashboard', href: '/shop/dashboard', icon: BarChart3 },
        { label: 'Products', href: '/shop/products', icon: Package },
        { label: 'Orders', href: '/shop/orders', icon: Receipt },
        { label: 'Payments', href: '/shop/payments', icon: CreditCard },
        { label: 'Promotions', href: '/shop/promotions', icon: Tag },
        { label: 'Shipping', href: '/shop/shipping', icon: Truck },
        { label: 'Analytics', href: '/shop/analytics', icon: TrendingUp },
      ],
    },
  ],
  proxy: { prefix: '/api/shop', target: 'http://localhost:50400', auth: 'jwt' },
};
