import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { siteInviteService } from '../../modules/site-membership/site-invite.service.js';

export const siteInvitesRoutes = new Elysia({ prefix: '/api/site-invites' }).use(authMiddleware).post(
  '/:token/accept',
  async ({ user, params }: any) => {
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const result = await siteInviteService.acceptInvite({
      token: params.token,
      email: user.email,
      userId: user.id,
      actorEmail: user.email,
    });
    return { data: result };
  },
  {
    requireAuth: true,
    params: t.Object({
      token: t.String({ minLength: 1, maxLength: 256 }),
    }),
  },
);
