import { describe, expect, it, vi } from 'vitest';
import { createProviderResolver, UnknownConnectorTypeError } from '$lib/providers/index.js';

describe('generic provider resolver', () => {
  it('resolves a downstream provider from a versioned manifest', () => {
    const provider = { connectorType: 'custom' } as never;
    const factory = vi.fn(() => provider);
    const resolver = createProviderResolver({ custom: factory });
    const manifest = {
      adapterManifestVersion: '1.0.0',
      connectorType: 'custom',
      connectorConfig: { endpoint: 'https://api.example.test' },
      capabilities: ['articles'],
    };

    expect(resolver.resolve(manifest)).toBe(provider);
    expect(factory).toHaveBeenCalledWith({
      manifest: expect.objectContaining({ connectorType: 'custom' }),
    });
  });

  it('keeps product-specific connectors outside the upstream package', () => {
    expect(() =>
      createProviderResolver().resolve({
        adapterManifestVersion: '1.0.0',
        connectorType: 'product-specific',
      }),
    ).toThrow(UnknownConnectorTypeError);
  });
});
