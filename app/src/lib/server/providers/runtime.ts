import postgres from 'postgres';
import { siteAdapterService } from '../../../../../backend/src/modules/site-adapter/site-adapter.service.js';
import {
  createWebsDrizzleProvider,
  type WebsDrizzleDatabase,
} from './webs-drizzle.js';
import type { DataProvider } from '$lib/providers/index.js';

const clients = new Map<string, postgres.Sql>();

function getDatabase(databaseUrl: string): WebsDrizzleDatabase {
  let client = clients.get(databaseUrl);
  if (!client) {
    client = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},
    });
    clients.set(databaseUrl, client);
  }

  return {
    execute: async <T>(query: { text: string; values: readonly unknown[] }) =>
      (await client!.unsafe(query.text, query.values as never[])) as readonly T[],
  };
}

export async function getSiteDataProvider(slug: string): Promise<DataProvider | null> {
  const adapter = await siteAdapterService.getBySlug(slug);
  if (!adapter || adapter.connectorType !== 'drizzle') return null;

  const databaseUrl = process.env.WEBS_DATABASE_URL ?? process.env.WEBS_DRIZZLE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('WEBS_DATABASE_URL is required for a drizzle site adapter');
  }

  const siteId = adapter.externalSiteReference ?? adapter.siteId;
  if (!siteId) throw new Error(`Adapter "${slug}" has no external site reference`);

  const connectorConfig = adapter.connectorConfig;
  return createWebsDrizzleProvider(getDatabase(databaseUrl), {
    databaseUrl,
    siteId,
    schema: typeof connectorConfig.schema === 'string' ? connectorConfig.schema : undefined,
    settingsTable:
      typeof connectorConfig.settingsTable === 'string'
        ? connectorConfig.settingsTable
        : undefined,
    homepageBlocksTable:
      typeof connectorConfig.homepageBlocksTable === 'string'
        ? connectorConfig.homepageBlocksTable
        : undefined,
    articlesTable:
      typeof connectorConfig.articlesTable === 'string' ? connectorConfig.articlesTable : undefined,
  });
}
