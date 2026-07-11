import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { integrationOperations, siteAdapters, siteMemberships, tenants, userTenantAccess, users } from '../../db/schema/index.js';
import { db } from '../../lib/db.js';
import { auditLogs } from '../../db/schema/index.js';
import type { ProvisionExternalSiteAccessRequest } from '../../api/validation/integration-site-access.schema.js';

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stableValue(entry)]));
  }
  return value;
};

export const canonicalPayloadHash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');

export interface SiteAccessProvisioningResult {
  operationId: string;
  tenantId: string;
  siteAdapterId: string;
  status: 'succeeded';
}

const operationResult = (value: unknown): SiteAccessProvisioningResult => value as SiteAccessProvisioningResult;

export async function provisionExternalSiteAccess(
  request: ProvisionExternalSiteAccessRequest,
  tokenJti = `operation:${request.operationId}`,
): Promise<SiteAccessProvisioningResult> {
  const payloadHash = canonicalPayloadHash(request);
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${request.operationId}))`);
    const existing = await tx.select().from(integrationOperations).where(eq(integrationOperations.operationId, request.operationId)).limit(1);
    if (existing[0]) {
      if (existing[0].payloadHash !== payloadHash) throw new Error('OPERATION_PAYLOAD_MISMATCH');
      if (existing[0].tokenJti !== tokenJti) throw new Error('OPERATION_TOKEN_MISMATCH');
      if (existing[0].status === 'succeeded' && existing[0].response) return operationResult(existing[0].response);
    } else {
      await tx.insert(integrationOperations).values({
        operationId: request.operationId,
        payloadHash,
        tokenJti,
        status: 'processing',
      });
    }

    const [owner] = await tx.select().from(users).where(and(eq(users.id, request.owner.platformUserId), eq(users.email, request.owner.email.toLowerCase()))).limit(1);
    if (!owner) throw new Error('OWNER_PROFILE_MISMATCH');

    const [tenant] = await tx.insert(tenants).values({
      slug: request.tenant.slug,
      name: request.tenant.name,
      email: request.owner.email.toLowerCase(),
      plan: 'free',
      status: 'pending',
      settings: { externalId: request.tenant.externalId },
    }).onConflictDoNothing().returning();
    if (!tenant) {
      const [existingTenant] = await tx.select().from(tenants).where(eq(tenants.slug, request.tenant.slug)).limit(1);
      if (!existingTenant || existingTenant.name !== request.tenant.name || (existingTenant.settings as { externalId?: string } | null)?.externalId !== request.tenant.externalId) throw new Error('TENANT_CONFLICT');
      throw new Error('TENANT_ALREADY_EXISTS');
    }

    await tx.insert(userTenantAccess).values({ userId: owner.id, tenantId: tenant.id, role: 'owner', permissions: ['all'] });
    const [adapter] = await tx.insert(siteAdapters).values({
      tenantId: tenant.id,
      slug: request.adapter.slug,
      adapterSlug: request.adapter.adapterSlug,
      publicSlug: request.adapter.publicSlug,
      name: request.adapter.name,
      backendUrl: request.adapter.backendUrl,
      apiBase: request.adapter.apiBase,
      auth: 'jwt',
      modules: request.adapter.modules,
      adapterManifestVersion: request.adapter.adapterManifestVersion,
      connectorType: request.adapter.connectorType,
      connectorConfig: request.adapter.connectorConfig,
      capabilities: request.adapter.capabilities,
      externalSiteReference: request.adapter.externalSiteReference,
      secretRefs: request.adapter.secretRefs,
      enabled: false,
    }).returning();
    await tx.insert(siteMemberships).values({ userId: owner.id, siteAdapterId: adapter.id, globalRole: 'viewer', role: 'admin', permissions: ['all'] });
    await tx.update(integrationOperations).set({
      status: 'succeeded',
      response: { operationId: request.operationId, tenantId: tenant.id, siteAdapterId: adapter.id, status: 'succeeded' },
      tenantId: tenant.id,
      siteAdapterId: adapter.id,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(integrationOperations.operationId, request.operationId));
    await tx.update(siteAdapters).set({ enabled: true, updatedAt: new Date() }).where(eq(siteAdapters.id, adapter.id));
    await tx.update(tenants).set({ status: 'active', updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
    await tx.insert(auditLogs).values({ actorId: `service:${tokenJti}`, actorEmail: 'service-integration', action: 'site_access:provision', resource: 'site_access', resourceId: request.operationId, newValue: { tenantId: tenant.id, siteAdapterId: adapter.id } });
    return { operationId: request.operationId, tenantId: tenant.id, siteAdapterId: adapter.id, status: 'succeeded' as const };
  });
  return result;
}

export async function compensateExternalSiteAccess(operationId: string, tokenJti: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${operationId}))`);
    const [operation] = await tx.select().from(integrationOperations).where(eq(integrationOperations.operationId, operationId)).limit(1);
    if (!operation) throw new Error('OPERATION_NOT_FOUND');
    if (operation.tokenJti !== tokenJti) throw new Error('OPERATION_TOKEN_MISMATCH');
    if (operation.status === 'compensated') return;
    if (!operation.tenantId || !operation.siteAdapterId) throw new Error('OPERATION_NOT_READY');
    await tx.update(siteAdapters).set({ enabled: false, updatedAt: new Date() }).where(eq(siteAdapters.id, operation.siteAdapterId));
    await tx.update(tenants).set({ status: 'suspended', updatedAt: new Date() }).where(eq(tenants.id, operation.tenantId));
    await tx.update(integrationOperations).set({ status: 'compensated', updatedAt: new Date(), completedAt: new Date() }).where(eq(integrationOperations.operationId, operationId));
    await tx.insert(auditLogs).values({ actorId: `service:${tokenJti}`, actorEmail: 'service-integration', action: 'site_access:compensate', resource: 'site_access', resourceId: operationId });
  });
}
