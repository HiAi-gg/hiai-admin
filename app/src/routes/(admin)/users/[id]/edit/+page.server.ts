import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/users/${params.id}`);
  const user = res.ok ? (await res.json()).data : null;
  return { user };
};
