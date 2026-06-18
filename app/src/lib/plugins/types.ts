import type { Component } from 'svelte';

export interface HiAiPlugin {
  id: string;
  name: string;
  version: string;
  icon?: string;
  description: string;
  navGroups: NavGroup[];
  proxy: ProxyConfig;
  pages?: PluginPage[];
  settings?: PluginSettings;
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
}

export interface NavGroup {
  label?: string;
  icon?: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  comingSoon?: boolean;
  disabled?: boolean;
}

export interface PluginPage {
  path: string;
  component: Component;
  title?: string;
}

export interface PluginSettings {
  component: Component;
}

export interface ProxyConfig {
  prefix: string;
  target: string;
  auth?: 'jwt' | 'api-key';
  rateLimit?: { requests: number; window: number };
}

/** Generic CMS modules a Site adapter can enable. */
export type SiteModule = 'articles' | 'homepage' | 'domains' | 'kofi' | 'newsletter' | 'generation';

/**
 * A Site adapter is a {@link HiAiPlugin} whose proxy target and enabled modules
 * come from per-tenant configuration (DB) rather than a static manifest. It lets
 * an arbitrary consumer site register itself as a source of admin data.
 * See HIAI_ADMIN_DIFFS §3.
 */
export interface SiteAdapter extends HiAiPlugin {
  kind: 'site';
  tenantId: string;
  modules: SiteModule[];
}
