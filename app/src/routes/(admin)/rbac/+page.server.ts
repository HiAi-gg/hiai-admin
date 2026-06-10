import { error } from '@sveltejs/kit';

export async function load({ fetch, locals }: { fetch: any; locals: any }) {
  if (!locals.user) throw error(401, 'Unauthorized');

  const headers = locals.session?.token ? { Authorization: `Bearer ${locals.session.token}` } : {};

  const [rolesRes, permsRes, usersRes, matrixRes] = await Promise.all([
    fetch('/api/rbac/roles?limit=200', { headers }),
    fetch('/api/rbac/permissions', { headers }),
    fetch('/api/rbac/users?limit=200', { headers }),
    fetch('/api/rbac/matrix', { headers }),
  ]);

  const roles = rolesRes.ok ? await rolesRes.json() : { data: [], total: 0 };
  const permissions = permsRes.ok ? await permsRes.json() : { data: [] };
  const users = usersRes.ok
    ? await usersRes.json()
    : { items: [], pagination: { total: 0, page: 1, totalPages: 1 } };
  const matrix = matrixRes.ok ? await matrixRes.json() : { roles: [], permissions: [], matrix: {} };

  return {
    roles: roles.data || [],
    permissions: permissions.data || [],
    users: users.items || [],
    usersPagination: users.pagination || { total: 0, page: 1, totalPages: 1 },
    matrix,
  };
}

export const ssr = true;
