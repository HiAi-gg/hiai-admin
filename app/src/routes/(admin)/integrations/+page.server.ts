import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/integrations');
  const integrations = res.ok ? await res.json() : { items: [] };
  return { integrations };
};
