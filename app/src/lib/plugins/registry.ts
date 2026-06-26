import type { HiAiPlugin, NavGroup, PluginPage, ProxyConfig } from './types.js';

const plugins = new Map<string, HiAiPlugin>();

export function registerPlugin(plugin: HiAiPlugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" is already registered. Skipping.`);
    return;
  }
  plugins.set(plugin.id, plugin);
}

export function getPlugins(): HiAiPlugin[] {
  return [...plugins.values()];
}

export function getPlugin(id: string): HiAiPlugin | undefined {
  return plugins.get(id);
}

export function getNavGroups(): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const plugin of plugins.values()) {
    for (const group of plugin.navGroups) {
      groups.push({ ...group });
    }
  }
  return groups;
}

export function findPage(pathname: string): { plugin: HiAiPlugin; page: PluginPage } | undefined {
  for (const plugin of plugins.values()) {
    if (!plugin.pages) continue;
    const page = plugin.pages.find((p) => pathname === p.path || pathname.startsWith(`${p.path}/`));
    if (page) return { plugin, page };
  }
  return undefined;
}

export function getProxyConfigs(): ProxyConfig[] {
  const configs: ProxyConfig[] = [];
  for (const plugin of plugins.values()) {
    if (plugin.proxy) configs.push(plugin.proxy);
  }
  return configs;
}

export function getProxyConfig(pluginId: string): ProxyConfig | undefined {
  return plugins.get(pluginId)?.proxy;
}

export function resetRegistry(): void {
  plugins.clear();
}
