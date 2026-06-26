import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/documents/recent?page=1&limit=20');
    if (!res.ok) return { error: `Documents API returned ${res.status}`, items: [] };
    const data = await res.json();
    return { ...data };
  } catch {
    return { error: 'Failed to load recent documents', items: [] };
  }
};
