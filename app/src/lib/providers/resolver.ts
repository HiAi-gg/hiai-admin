import type { AdapterManifest } from '$lib/contracts/index.js';
import { adapterManifestSchema } from '$lib/contracts/index.js';
import type { DataProvider, DataProviderFactory, ProviderContext } from './types.js';

export class UnknownConnectorTypeError extends Error {
  constructor(connectorType: string) {
    super(`No data provider registered for connector type "${connectorType}"`);
    this.name = 'UnknownConnectorTypeError';
  }
}

export class ProviderResolver {
  private readonly factories = new Map<string, DataProviderFactory>();

  register(connectorType: string, factory: DataProviderFactory): this {
    if (this.factories.has(connectorType)) {
      throw new Error(`A data provider is already registered for "${connectorType}"`);
    }
    this.factories.set(connectorType, factory);
    return this;
  }

  resolve(input: unknown): DataProvider {
    const manifest = adapterManifestSchema.parse(input);
    return this.resolveManifest(manifest);
  }

  resolveManifest(manifest: AdapterManifest): DataProvider {
    const factory = this.factories.get(manifest.connectorType);
    if (!factory) throw new UnknownConnectorTypeError(manifest.connectorType);
    return factory({ manifest } satisfies ProviderContext);
  }
}

export function createProviderResolver(
  factories: Record<string, DataProviderFactory> = {},
): ProviderResolver {
  const resolver = new ProviderResolver();
  for (const [connectorType, factory] of Object.entries(factories)) {
    resolver.register(connectorType, factory);
  }
  return resolver;
}
