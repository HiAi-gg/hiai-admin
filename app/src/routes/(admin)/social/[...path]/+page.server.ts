import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const path = params.path || 'dashboard';
  try {
    const res = await fetch(`/api/social/api/v1/${path}`);
    if (!res.ok) return { title: path, error: `API returned ${res.status}`, items: [] };
    const data = await res.json();
    return { title: path, ...data };
  } catch (e) {
    return { title: path, error: String(e), items: [] };
  }
};
