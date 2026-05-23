import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const [tenantRes, usersRes] = await Promise.all([
    fetch(`/api/tenants/${params.id}`),
    fetch(`/api/users?tenantId=${params.id}`)
  ]);
  const tenant = await tenantRes.json();
  const users = await usersRes.json();
  return { tenant: tenant.data, users: users.data || [] };
};
