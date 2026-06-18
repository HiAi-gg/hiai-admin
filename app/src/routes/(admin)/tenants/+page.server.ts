import { api } from '$lib/api.js';

export async function load({ url }) {
  const page = Number(url.searchParams.get('page')) || 1;
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const result = await api.get<{
      data: any[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/api/tenants?${params.toString()}`);

    return {
      tenants: result.data ?? [],
      page: result.pagination?.page ?? page,
      totalPages: result.pagination?.pages ?? 1,
      search,
      status,
    };
  } catch {
    return {
      tenants: [],
      page: 1,
      totalPages: 1,
      search,
      status,
    };
  }
}
