import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const query = url.searchParams.get('q') ?? '';
  try {
    const res = await fetch(`/api/documents/search?q=${encodeURIComponent(query)}&page=1&limit=20`);
    if (!res.ok) return { error: `Documents API returned ${res.status}`, items: [], query };
    const data = await res.json();
    return { ...data, query };
  } catch {
    return { error: 'Failed to load documents search', items: [], query };
  }
};
