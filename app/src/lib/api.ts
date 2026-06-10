import { createApi } from '@hiai/ui';

const API_BASE =
  typeof window !== 'undefined' ? '' : process.env.API_URL || 'http://localhost:50200';
export const api = createApi(API_BASE);
