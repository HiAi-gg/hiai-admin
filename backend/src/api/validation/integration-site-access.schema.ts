import { z } from 'zod';

const slug = z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/);
const nonEmpty = z.string().trim().min(1).max(255);

export const provisionExternalSiteAccessSchema = z.object({
  operationId: nonEmpty,
  owner: z.object({
    platformUserId: nonEmpty,
    email: z.string().trim().email().max(320),
  }),
  tenant: z.object({
    externalId: nonEmpty,
    slug,
    name: nonEmpty.max(200),
    plan: z.literal('free'),
  }),
  adapter: z.object({
    slug,
    name: nonEmpty.max(200),
    backendUrl: z.string().url(),
    apiBase: z.string().trim().regex(/^\//),
    auth: z.literal('jwt'),
    modules: z.array(nonEmpty.max(100)).max(100),
    publicSlug: slug,
    adapterSlug: slug,
    adapterManifestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    connectorType: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/),
    connectorConfig: z.record(z.string(), z.unknown()),
    capabilities: z.array(nonEmpty.max(100)).max(100),
    externalSiteReference: nonEmpty,
    secretRefs: z.record(nonEmpty, nonEmpty),
  }),
});

export type ProvisionExternalSiteAccessRequest = z.infer<
  typeof provisionExternalSiteAccessSchema
>;

export const serviceAccessOperationIdSchema = z.object({
  operationId: nonEmpty,
});
