import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/users/${params.id}`);
  const data = await res.json();
  return { user: data.data };
};
