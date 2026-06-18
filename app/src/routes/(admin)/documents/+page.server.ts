import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/documents/api/documents?page=1&limit=20');
    if (!res.ok) return { error: `Documents API returned ${res.status}`, items: [] };
    const data = await res.json();
    return { ...data };
  } catch (e) {
    return { error: String(e), items: [] };
  }
};
