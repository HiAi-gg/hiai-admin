import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const [plansRes, subRes, invoicesRes] = await Promise.allSettled([
    fetch('/api/billing/plans'),
    fetch('/api/billing/subscription'),
    fetch('/api/billing/invoices'),
  ]);

  const plans =
    plansRes.status === 'fulfilled' && plansRes.value.ok ? await plansRes.value.json() : [];
  const subscription =
    subRes.status === 'fulfilled' && subRes.value.ok ? await subRes.value.json() : null;
  const invoices =
    invoicesRes.status === 'fulfilled' && invoicesRes.value.ok
      ? await invoicesRes.value.json()
      : { items: [] };

  return { plans, subscription, invoices };
};
