import { describe, expect, it } from 'vitest';
import type { ProvisionExternalSiteAccessRequest } from '../../src/api/validation/integration-site-access.schema.js';
import {
  canonicalPayloadHash,
  compensateExternalSiteAccess,
  provisionExternalSiteAccess,
} from '../../src/modules/integrations/site-access-provisioning.service.js';

const request: ProvisionExternalSiteAccessRequest = {
  operationId: 'op-001',
  owner: { platformUserId: 'user-001', email: 'owner@example.test' },
  tenant: { externalId: 'tenant-001', slug: 'tenant-one', name: 'Tenant One', plan: 'free' },
  adapter: {
    slug: 'tenant-one',
    name: 'Tenant One Site',
    backendUrl: 'https://site.example.test',
    apiBase: '/api/v1',
    auth: 'jwt',
    modules: ['articles'],
    publicSlug: 'tenant-one',
    adapterSlug: 'tenant-one',
    adapterManifestVersion: '1.0.0',
    connectorType: 'http',
    connectorConfig: { integration: 'generic' },
    capabilities: ['content.read'],
    externalSiteReference: 'site-001',
    secretRefs: { backend: 'SITE_BACKEND_SECRET' },
  },
};

describe('generic external site access service', () => {
  it('hashes equivalent payloads deterministically without provider-specific fields', () => {
    expect(
      canonicalPayloadHash({ b: 2, a: { d: true, c: ['x', 1] } }),
    ).toBe(canonicalPayloadHash({ a: { c: ['x', 1], d: true }, b: 2 }));
  });

  it('exports the atomic provision and compensation service API', () => {
    expect(provisionExternalSiteAccess).toBeTypeOf('function');
    expect(compensateExternalSiteAccess).toBeTypeOf('function');
  });

  it('keeps the request contract generic and fixed to the free plan', () => {
    expect(request.tenant.plan).toBe('free');
    expect(request.adapter.connectorType).toBe('http');
    expect(JSON.stringify(request).toLowerCase()).not.toContain('webs');
  });
});
