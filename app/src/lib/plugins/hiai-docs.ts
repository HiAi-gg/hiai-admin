import type { HiAiPlugin } from './types.js';

const docsTarget = process.env.HIAI_DOCS_API ?? 'http://localhost:50700';

export const hiaiDocsPlugin: HiAiPlugin = {
  id: 'hiai-docs',
  name: 'Documents',
  version: '1.0.0',
  icon: '📄',
  description: 'Multi-tenant document collaboration (hiai-docs backend)',
  navGroups: [
    {
      label: 'Documents',
      items: [
        { label: 'Browse', href: '/documents', icon: '📚' },
        { label: 'Search', href: '/documents/search', icon: '🔍' },
        { label: 'Recent', href: '/documents/recent', icon: '🕘' },
      ],
    },
  ],
  // Docs backend uses Better Auth; we authenticate as `HIAI_DOCS_API_KEY` via the
  // caller's forwarded Authorization header (api-key mode). The proxy will forward
  // the admin's session cookie / Authorization as-is.
  proxy: { prefix: '/api/documents', target: docsTarget, auth: 'api-key' },
};
