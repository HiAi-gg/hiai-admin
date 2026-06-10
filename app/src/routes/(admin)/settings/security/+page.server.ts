import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/users/me/sessions');
  const sessions = res.ok ? await res.json() : { items: [] };
  return { sessions };
};
