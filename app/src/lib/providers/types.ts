import type {
  AdapterManifest,
  ArticleDTO,
  ArticleInput,
  HomepageBlockDTO,
  HomepageBlockInput,
  HomepageBlockReorderInput,
  SiteSettingsDTO,
  SiteSettingsInput,
} from '$lib/contracts/index.js';

export interface DataProvider {
  readonly connectorType: AdapterManifest['connectorType'];
  getSiteSettings(): Promise<SiteSettingsDTO>;
  updateSiteSettings(input: SiteSettingsInput): Promise<SiteSettingsDTO>;
  listHomepageBlocks(): Promise<HomepageBlockDTO[]>;
  createHomepageBlock(input: HomepageBlockInput): Promise<HomepageBlockDTO>;
  updateHomepageBlock(id: string, input: HomepageBlockInput): Promise<HomepageBlockDTO>;
  deleteHomepageBlock(id: string): Promise<void>;
  reorderHomepageBlocks(order: HomepageBlockReorderInput): Promise<void>;
  saveHomepageBlocks(blocks: HomepageBlockDTO[]): Promise<HomepageBlockDTO[]>;
  listArticles(): Promise<ArticleDTO[]>;
  getArticle(id: string): Promise<ArticleDTO | null>;
  saveArticle(input: ArticleInput, id?: string): Promise<ArticleDTO>;
  deleteArticle(id: string): Promise<void>;
}

export interface ProviderContext {
  manifest: AdapterManifest;
}

export type DataProviderFactory = (context: ProviderContext) => DataProvider;
