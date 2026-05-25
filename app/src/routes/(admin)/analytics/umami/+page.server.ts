import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return {
    umamiUrl: process.env.UMAMI_URL || '',
  };
};
