import { auditService } from '../../../../backend/src/modules/audit/audit.service.js';

export type SiteMutationAuditPhase = 'attempt' | 'success' | 'failure';

interface SiteAuditUser {
  id: string;
  email: string;
}

export interface SiteMutationAuditInput {
  user: SiteAuditUser | null;
  request: Request;
  siteSlug: string;
  action: string;
  resource: string;
  resourceId?: string;
  phase: SiteMutationAuditPhase;
  details?: Record<string, unknown>;
}

export class SiteAuditError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SiteAuditError';
  }
}

export async function recordSiteMutationAudit(input: SiteMutationAuditInput): Promise<void> {
  if (!input.user) {
    throw new SiteAuditError('Authenticated user is required for site mutation audit');
  }

  const ipAddress =
    input.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    input.request.headers.get('x-real-ip') ||
    '127.0.0.1';

  try {
    await auditService.record({
      actorId: input.user.id,
      actorEmail: input.user.email,
      action: `${input.action}:${input.phase}`,
      resource: input.resource,
      resourceId: input.resourceId ?? input.siteSlug,
      newValue: {
        siteSlug: input.siteSlug,
        phase: input.phase,
        ...input.details,
      },
      ipAddress,
      userAgent: input.request.headers.get('user-agent') || '',
    });
  } catch (cause) {
    throw new SiteAuditError(
      input.phase === 'attempt'
        ? 'Audit log unavailable; site mutation was not started'
        : 'Site mutation completed, but its audit result could not be recorded',
      { cause },
    );
  }
}

export async function recordSiteMutationFailure(
  input: Omit<SiteMutationAuditInput, 'phase'>,
  error: unknown,
): Promise<void> {
  try {
    await recordSiteMutationAudit({
      ...input,
      phase: 'failure',
      details: {
        ...input.details,
        error: error instanceof Error ? error.message : 'Unknown site mutation error',
      },
    });
  } catch {
    // The pre-mutation attempt record already exists. Preserve the original
    // provider error instead of replacing it with a secondary audit failure.
  }
}
