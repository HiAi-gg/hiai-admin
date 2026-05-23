import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const page = Number(url.searchParams.get('page') || '1');
  const search = url.searchParams.get('search') || '';

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);

  const res = await fetch(`/api/users?${params}`);
  const data = res.ok ? await res.json() : { items: [], total: 0, page: 1, totalPages: 1 };

  return { users: data, page, search };
};
