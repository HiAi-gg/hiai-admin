import type {
  ArticleDTO,
  ArticleInput,
  HomepageBlockDTO,
  HomepageBlockInput,
  SiteSettingsDTO,
  SiteSettingsInput,
} from './types.js';

export const DATA_PROVIDER_CAPABILITIES = ['articles', 'homepage', 'settings'] as const;
export type DataProviderCapability = (typeof DATA_PROVIDER_CAPABILITIES)[number];

export interface ArticleModule {
  list(): Promise<ArticleDTO[]>;
  get(id: string): Promise<ArticleDTO | null>;
  create(input: ArticleInput): Promise<ArticleDTO>;
  update(id: string, input: ArticleInput): Promise<ArticleDTO>;
  delete(id: string): Promise<void>;
}

export interface HomepageModule {
  listBlocks(): Promise<HomepageBlockDTO[]>;
  saveBlocks(blocks: HomepageBlockDTO[]): Promise<HomepageBlockDTO[]>;
  createBlock(input: HomepageBlockInput): Promise<HomepageBlockDTO>;
  updateBlock(id: string, input: HomepageBlockInput): Promise<HomepageBlockDTO>;
  deleteBlock(id: string): Promise<void>;
}

export interface SiteSettingsModule {
  get(): Promise<SiteSettingsDTO>;
  update(input: SiteSettingsInput): Promise<SiteSettingsDTO>;
}

/**
 * Provider capabilities are explicit so consumers can avoid calling modules
 * that the selected provider does not implement.
 */
export interface DataProvider {
  readonly capabilities: readonly DataProviderCapability[];
  readonly articles?: ArticleModule;
  readonly homepage?: HomepageModule;
  readonly settings?: SiteSettingsModule;
}
