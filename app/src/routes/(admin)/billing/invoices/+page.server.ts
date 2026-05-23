import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/billing/invoices');
  const invoices = res.ok ? await res.json() : { items: [] };
  return { invoices };
};
