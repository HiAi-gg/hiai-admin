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
