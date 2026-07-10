import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { AppError, badRequest, ErrorCode } from '../../lib/errors.js';
import { withTransaction } from '../../lib/db.js';
import { auditService } from '../audit/audit.service.js';
import { siteInvites, userTenantAccess, siteMemberships } from '../../db/schema/index.js';

const FORBIDDEN_ROLES = new Set(['super_admin', 'tenant_admin']);

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function resolveInviteRole(role: string): 'viewer' | 'editor' {
  if (FORBIDDEN_ROLES.has(role)) {
    throw badRequest('Invite role is not allowed');
  }
  if (role === 'editor') return 'editor';
  return 'viewer';
}

export interface AcceptInviteInput {
  token: string;
  email: string;
  userId: string;
  actorEmail: string;
}

export interface AcceptInviteResult {
  status: 'accepted';
  tenantId: string;
  siteAdapterId: string;
  role: 'viewer' | 'editor';
}

export const siteInviteService = {
  async acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
    const tokenHash = hashInviteToken(input.token);
    const now = new Date();

    return withTransaction(async (tx) => {
      const [invite] = await tx
        .select({
          id: siteInvites.id,
          tenantId: siteInvites.tenantId,
          siteAdapterId: siteInvites.siteAdapterId,
          email: siteInvites.email,
          role: siteInvites.role,
          permissions: siteInvites.permissions,
          acceptedAt: siteInvites.acceptedAt,
          expiresAt: siteInvites.expiresAt,
        })
        .from(siteInvites)
        .where(and(eq(siteInvites.tokenHash, tokenHash)))
        .limit(1);

      if (!invite) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Invite not found' });
      }

      if (invite.acceptedAt) {
        throw badRequest('Invite has already been accepted');
      }

      if (invite.expiresAt && invite.expiresAt < now) {
        throw badRequest('Invite has expired');
      }

      if (invite.email !== input.email) {
        throw badRequest('Invite email does not match current session');
      }

    const role = resolveInviteRole(invite.role ?? 'viewer');
      const permissions = invite.permissions ?? [];

      await tx
        .insert(userTenantAccess)
        .values({
          userId: input.userId,
          tenantId: invite.tenantId,
          role,
          permissions,
        })
        .onConflictDoUpdate({
          target: [userTenantAccess.userId, userTenantAccess.tenantId],
          set: {
            role,
            permissions,
          },
        });

      await tx
        .insert(siteMemberships)
        .values({
          userId: input.userId,
          siteAdapterId: invite.siteAdapterId,
          globalRole: role,
          role,
          permissions,
        })
        .onConflictDoUpdate({
          target: [siteMemberships.userId, siteMemberships.siteAdapterId],
          set: {
            globalRole: role,
            role,
            permissions,
          },
        });

      await tx.update(siteInvites).set({ acceptedAt: now }).where(eq(siteInvites.id, invite.id));

      await auditService.record({
        actorId: input.userId,
        actorEmail: input.actorEmail,
        action: 'site-invite:accept',
        resource: 'site_invite',
        resourceId: invite.id,
        newValue: {
          tenantId: invite.tenantId,
          siteAdapterId: invite.siteAdapterId,
          role,
        },
      });

      return {
        status: 'accepted',
        tenantId: invite.tenantId,
        siteAdapterId: invite.siteAdapterId,
        role,
      };
    });
  },
};
