import type { HiAiPlugin, NavIcon } from './types.js';
import { BookOpen, History, Search, FileText } from 'lucide-svelte';

const docsTarget = process.env.HIAI_DOCS_API ?? 'http://localhost:50700';

export const hiaiDocsPlugin: HiAiPlugin = {
  id: 'hiai-docs',
  name: 'Documents',
  version: '1.0.0',
  icon: FileText as unknown as NavIcon,
  description: 'Multi-tenant document collaboration (hiai-docs backend)',
  navGroups: [
    {
      label: 'Documents',
      items: [
        { label: 'Browse', href: '/documents', icon: BookOpen as unknown as string },
        { label: 'Search', href: '/documents/search', icon: Search as unknown as string },
        { label: 'Recent', href: '/documents/recent', icon: History as unknown as string },
      ],
    },
  ],
  // Docs backend uses Better Auth; we authenticate as `HIAI_DOCS_API_KEY` via the
  // caller's forwarded Authorization header (api-key mode). The proxy will forward
  // the admin's session cookie / Authorization as-is.
  proxy: { prefix: '/api/documents', target: docsTarget, auth: 'api-key' },
};
