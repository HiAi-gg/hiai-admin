import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const [sessionsRes, recentRes, scoreRes] = await Promise.allSettled([
    fetch('/api/users/me/sessions'),
    fetch('/api/audit?limit=10&action=login'),
    fetch('/api/security/score'),
  ]);

  const sessions =
    sessionsRes.status === 'fulfilled' && sessionsRes.value.ok
      ? await sessionsRes.value.json()
      : { items: [] };
  const recentLogins =
    recentRes.status === 'fulfilled' && recentRes.value.ok
      ? await recentRes.value.json()
      : { items: [] };
  const securityScore =
    scoreRes.status === 'fulfilled' && scoreRes.value.ok
      ? ((await scoreRes.value.json()).score ?? 75)
      : 75;

  return { sessions, recentLogins, securityScore };
};
