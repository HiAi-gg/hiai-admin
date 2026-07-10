import type { HiAiPlugin, NavGroup, PluginPage, ProxyConfig } from './types.js';
import type {
  DataProvider,
  DataProviderCapability,
} from './contracts/index.js';

const plugins = new Map<string, HiAiPlugin>();

export interface ProviderContext {
  readonly connectorType: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly requestedCapabilities: readonly DataProviderCapability[];
}

export type ProviderFactory = (context: ProviderContext) => DataProvider;

export interface ProviderRequest {
  readonly connectorType: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly capabilities?: readonly DataProviderCapability[];
}

export class UnsupportedConnectorError extends Error {
  constructor(connectorType: string) {
    super(`No data provider is registered for connector type "${connectorType}"`);
    this.name = 'UnsupportedConnectorError';
  }
}

export class UnsupportedCapabilityError extends Error {
  constructor(connectorType: string, capability: DataProviderCapability) {
    super(`Provider "${connectorType}" does not support capability "${capability}"`);
    this.name = 'UnsupportedCapabilityError';
  }
}

export function hasProviderCapability(
  provider: DataProvider,
  capability: DataProviderCapability,
): boolean {
  return provider.capabilities.includes(capability) &&
    ((capability === 'articles' && provider.articles !== undefined) ||
      (capability === 'homepage' && provider.homepage !== undefined) ||
      (capability === 'settings' && provider.settings !== undefined));
}

export function createWebsProviderStub(): DataProvider {
  return { capabilities: [] };
}

export class ProviderRegistry {
  private readonly factories = new Map<string, ProviderFactory>();

  register(connectorType: string, factory: ProviderFactory): this {
    if (this.factories.has(connectorType)) {
      throw new Error(`A data provider is already registered for "${connectorType}"`);
    }
    this.factories.set(connectorType, factory);
    return this;
  }

  resolve(request: string | ProviderRequest): DataProvider {
    const normalized = typeof request === 'string' ? { connectorType: request } : request;
    const factory = this.factories.get(normalized.connectorType);
    if (!factory) throw new UnsupportedConnectorError(normalized.connectorType);

    const requestedCapabilities = normalized.capabilities ?? [];
    const provider = factory({
      connectorType: normalized.connectorType,
      config: normalized.config ?? {},
      requestedCapabilities,
    });
    for (const capability of requestedCapabilities) {
      if (!hasProviderCapability(provider, capability)) {
        throw new UnsupportedCapabilityError(normalized.connectorType, capability);
      }
    }
    return provider;
  }
}

export function createProviderRegistry(
  factories: Record<string, ProviderFactory> = {},
): ProviderRegistry {
  const registry = new ProviderRegistry();
  for (const [connectorType, factory] of Object.entries(factories)) {
    registry.register(connectorType, factory);
  }
  return registry;
}

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
