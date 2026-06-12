import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const umamiUrl = process.env.UMAMI_URL || 'http://localhost:3005';
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID || '';
  const umamiUsername = process.env.UMAMI_USERNAME || 'admin';
  return {
    umamiUrl,
    umamiWebsiteId,
    umamiUsername,
  };
};
