import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Verify super_admin role
  const res = await fetch('/api/users/me');
  if (res.ok) {
    const user = await res.json();
    if (user.role !== 'super_admin') {
      throw redirect(302, '/unauthorized');
    }
  }

  return { user: locals.user };
};
