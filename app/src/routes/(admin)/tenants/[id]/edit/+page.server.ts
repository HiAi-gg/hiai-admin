import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/tenants/${params.id}`);
  const tenant = res.ok ? (await res.json()).data : null;
  return { tenant };
};
