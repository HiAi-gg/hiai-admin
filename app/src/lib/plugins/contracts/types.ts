import type { z } from 'zod';
import type {
  articleInputSchema,
  articleSchema,
  articleStatusSchema,
  homepageBlockInputSchema,
  homepageBlockSchema,
  siteSettingsInputSchema,
  siteSettingsSchema,
} from './schemas.js';

export type ArticleStatus = z.infer<typeof articleStatusSchema>;
export type ArticleDTO = z.infer<typeof articleSchema>;
export type ArticleInput = z.infer<typeof articleInputSchema>;

export type HomepageBlockDTO = z.infer<typeof homepageBlockSchema>;
export type HomepageBlockInput = z.infer<typeof homepageBlockInputSchema>;

export type SiteSettingsDTO = z.infer<typeof siteSettingsSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
