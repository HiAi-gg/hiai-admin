import type { HiAiPlugin } from './types.js';
import { BookOpen, History, Search, FileText } from 'lucide-svelte';

const docsTarget = process.env.HIAI_DOCS_API ?? 'http://localhost:50700';

export const hiaiDocsPlugin: HiAiPlugin = {
  id: 'hiai-docs',
  name: 'Documents',
  version: '1.0.0',
  icon: FileText,
  description: 'Multi-tenant document collaboration (hiai-docs backend)',
  navGroups: [
    {
      label: 'Documents',
      icon: FileText,
      items: [
        { label: 'Browse', href: '/documents', icon: BookOpen },
        { label: 'Search', href: '/documents/search', icon: Search },
        { label: 'Recent', href: '/documents/recent', icon: History },
      ],
    },
  ],
  // Docs backend uses Better Auth; we authenticate as `HIAI_DOCS_API_KEY` via the
  // caller's forwarded Authorization header (api-key mode). The proxy will forward
  // the admin's session cookie / Authorization as-is.
  proxy: { prefix: '/api/documents', target: docsTarget, auth: 'api-key' },
};
