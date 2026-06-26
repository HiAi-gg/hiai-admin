import type { Component } from 'svelte';
// Re-use @hiai/ui's NavIcon so plugin manifest types stay structurally
// compatible with the AdminSidebar's NavGroup / NavItem — variance issues
// aside, this keeps a single source of truth for the icon contract.
import type { NavGroup, NavItem, NavIcon as UINavIcon } from '@hiai/ui';

export type NavIcon = UINavIcon;

export interface HiAiPlugin {
  id: string;
  name: string;
  version: string;
  icon?: NavIcon;
  description: string;
  navGroups: NavGroup[];
  proxy: ProxyConfig;
  pages?: PluginPage[];
  settings?: PluginSettings;
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
}

export type { NavGroup, NavItem };

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
