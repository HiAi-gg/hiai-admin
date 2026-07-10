import {
  type AdapterManifest,
  type ArticleDTO,
  type ArticleInput,
  adapterManifestSchema,
  articleSchema,
  articlesSchema,
  type HomepageBlockDTO,
  homepageBlocksSchema,
  type SiteSettingsDTO,
  type SiteSettingsInput,
  siteSettingsSchema,
} from '$lib/contracts/index.js';
import type { DataProvider } from '$lib/providers/index.js';

const identifierSchema = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface WebsDrizzleConfig {
  databaseUrl: string;
  siteId: string;
  schema?: string;
  settingsTable?: string;
  homepageBlocksTable?: string;
  articlesTable?: string;
}

export interface WebsDrizzleQuery {
  text: string;
  values: readonly unknown[];
}

export interface WebsDrizzleDatabase {
  execute<T>(query: WebsDrizzleQuery): Promise<readonly T[]>;
}

interface WebsSiteRow {
  id: string | number;
  slug: string;
  name: string;
  description?: string | null;
  domain?: string | null;
  config?: unknown;
}

function identifier(value: string, label: string): string {
  if (!identifierSchema.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function table(config: WebsDrizzleConfig, name: string, label: string): string {
  return `${identifier(config.schema ?? 'public', 'schema')}.${identifier(name, label)}`;
}

export function websDrizzleConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): WebsDrizzleConfig {
  const databaseUrl = env.WEBS_DATABASE_URL ?? env.WEBS_DRIZZLE_DATABASE_URL;
  const siteId = env.WEBS_SITE_ID;
  if (!databaseUrl) throw new Error('WEBS_DATABASE_URL is required for the Webs Drizzle provider');
  if (!siteId) throw new Error('WEBS_SITE_ID is required for the Webs Drizzle provider');
  return { databaseUrl, siteId };
}

function createQuery(text: string, values: readonly unknown[] = []): WebsDrizzleQuery {
  return { text, values };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function siteSettingsFromRow(row: WebsSiteRow): SiteSettingsDTO {
  const config = asRecord(row.config);
  return siteSettingsSchema.parse({
    siteId: String(row.id),
    slug: row.slug,
    title: row.name,
    description: row.description ?? '',
    locale: typeof config.locale === 'string' ? config.locale : 'en',
    timezone: typeof config.timezone === 'string' ? config.timezone : 'UTC',
    logoUrl: typeof config.logoUrl === 'string' ? config.logoUrl : null,
    faviconUrl: typeof config.faviconUrl === 'string' ? config.faviconUrl : null,
    metadata: config,
  });
}

export function createWebsDrizzleProvider(
  database: WebsDrizzleDatabase,
  config: WebsDrizzleConfig,
): DataProvider {
  const settingsTable = table(config, config.settingsTable ?? 'sites', 'settingsTable');
  const blocksTable = table(
    config,
    config.homepageBlocksTable ?? 'homepage_blocks',
    'homepageBlocksTable',
  );
  const articlesTable = table(config, config.articlesTable ?? 'articles', 'articlesTable');

  return {
    connectorType: 'drizzle',
    async getSiteSettings(): Promise<SiteSettingsDTO> {
      const rows = await database.execute<unknown>(
        createQuery(
          `select id, slug, name, description, domain, config from ${settingsTable} where id::text = $1 or slug = $1 limit 1`,
          [config.siteId],
        ),
      );
      return siteSettingsFromRow(rows[0] as WebsSiteRow);
    },
    async updateSiteSettings(input: SiteSettingsInput): Promise<SiteSettingsDTO> {
      const current = await this.getSiteSettings();
      const next = siteSettingsSchema.parse({ ...current, ...input, siteId: config.siteId });
      const metadata = { ...current.metadata, ...next.metadata };
      const rows = await database.execute<unknown>(
        createQuery(
          `update ${settingsTable} set slug = $1, name = $2, description = $3, config = $4 where id::text = $5 or slug = $5 returning id, slug, name, description, domain, config`,
          [
            next.slug,
            next.title,
            next.description,
            { ...metadata, locale: next.locale, timezone: next.timezone, logoUrl: next.logoUrl, faviconUrl: next.faviconUrl },
            config.siteId,
          ],
        ),
      );
      return rows[0] ? siteSettingsFromRow(rows[0] as WebsSiteRow) : { ...next, metadata };
    },
    async listHomepageBlocks(): Promise<HomepageBlockDTO[]> {
      const rows = await database.execute<unknown>(
        createQuery(
          `select id::text, type, order_index as "order", content as data from ${blocksTable} where site_id = $1 order by order_index asc`,
          [config.siteId],
        ),
      );
      return homepageBlocksSchema.parse(rows);
    },
    async saveHomepageBlocks(blocks: HomepageBlockDTO[]): Promise<HomepageBlockDTO[]> {
      const validated = homepageBlocksSchema.parse(blocks);
      for (const block of validated) {
        await database.execute(
          createQuery(
            `update ${blocksTable} set type = $1, order_index = $2, content = $3 where id = $4 and site_id = $5`,
            [block.type, block.order, block.data, block.id, config.siteId],
          ),
        );
      }
      return validated;
    },
    async listArticles(): Promise<ArticleDTO[]> {
      const rows = await database.execute<unknown>(
        createQuery(
          `select id::text, title, status, language, slug, updated_at as "updatedAt", content, excerpt, published_at as "publishedAt" from ${articlesTable} where site_id = $1 order by updated_at desc`,
          [config.siteId],
        ),
      );
      return articlesSchema.parse(rows);
    },
    async getArticle(id: string): Promise<ArticleDTO | null> {
      const rows = await database.execute<unknown>(
        createQuery(
          `select id::text, title, status, language, slug, updated_at as "updatedAt", content, excerpt, published_at as "publishedAt" from ${articlesTable} where site_id = $1 and id = $2 limit 1`,
          [config.siteId, id],
        ),
      );
      return rows[0] === undefined ? null : articleSchema.parse(rows[0]);
    },
    async saveArticle(input: ArticleInput, id?: string): Promise<ArticleDTO> {
      void input;
      throw new Error(
        `Webs article writes are scaffolded but not implemented${id ? ` for ${id}` : ''}`,
      );
    },
    async deleteArticle(id: string): Promise<void> {
      throw new Error(`Webs article deletes are scaffolded but not implemented for ${id}`);
    },
  };
}

export function createWebsDrizzleFactory(database: WebsDrizzleDatabase, config: WebsDrizzleConfig) {
  return ({ manifest }: { manifest: AdapterManifest }): DataProvider => {
    const parsed = adapterManifestSchema.parse(manifest);
    if (parsed.connectorType !== 'drizzle')
      throw new Error('Webs Drizzle provider requires connectorType=drizzle');
    return createWebsDrizzleProvider(database, config);
  };
}
