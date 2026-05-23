import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const [sessionsRes, recentRes] = await Promise.allSettled([
    fetch('/api/users/me/sessions'),
    fetch('/api/audit?limit=10&action=login')
  ]);

  const sessions = sessionsRes.status === 'fulfilled' && sessionsRes.value.ok ? await sessionsRes.value.json() : { items: [] };
  const recentLogins = recentRes.status === 'fulfilled' && recentRes.value.ok ? await recentRes.value.json() : { items: [] };

  return { sessions, recentLogins };
};
