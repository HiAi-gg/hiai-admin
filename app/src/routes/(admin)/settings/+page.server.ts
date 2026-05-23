import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/settings');
  const settings = res.ok ? await res.json() : { items: [] };
  return { settings };
};
