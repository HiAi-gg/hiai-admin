import { api } from '$lib/api.js';

export async function load({ url }) {
  const page = Number(url.searchParams.get('page')) || 1;
  try {
    return await api.get<{ logs: any[]; pagination: any }>(`/api/audit?page=${page}&limit=50`);
  } catch {
    return { logs: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  }
}
