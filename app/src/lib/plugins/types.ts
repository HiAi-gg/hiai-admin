import type { Component } from 'svelte';
import type { NavGroup, NavItem } from '@hiai/ui';

// Local icon contract for plugin manifests. The fresh @hiai/ui NavItem.icon
// is typed as `string` (AdminSidebar renders it as text), but the plugins
// in this directory still pass Svelte components (lucide-svelte Svelte
// 4-style classes) as the runtime icon — AdminSidebar ignores the icon
// shape, so a permissive `unknown` is the pragmatic bridge. Plugin code
// can assign either a lucide component or an emoji/string here.
//
// Use `NavIcon` for plugin-level metadata (HiAiPlugin.icon). For NavItem
// entries that feed AdminSidebar, the type system demands `string`; cast
// with `as unknown as string` at the assignment site.
export type NavIcon = unknown;

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
