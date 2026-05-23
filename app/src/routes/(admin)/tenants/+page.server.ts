import { api } from '$lib/api.js';

export async function load({ url }) {
  const page = Number(url.searchParams.get('page')) || 1;
  const status = url.searchParams.get('status') || undefined;
  try {
    const result = await api.get<{ tenants: any[]; pagination: any }>(`/api/tenants?page=${page}&status=${status || ''}`);
    return result;
  } catch {
    return { tenants: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}
