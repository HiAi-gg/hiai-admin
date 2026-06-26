<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template (<DataTable>)
import { DataTable } from '@hiai/ui';
// biome-ignore lint/correctness/noUnusedImports: used in template (<ModuleLayout>)
import ModuleLayout from '$lib/components/ModuleLayout.svelte';

let { data } = $props();

function extractArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['items', 'data', 'results', 'documents']) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
    }
  }
  return [];
}

// biome-ignore lint/correctness/noUnusedVariables: used in template (DataTable data={records})
const records = $derived(extractArray(data));

function formatShort(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

// biome-ignore lint/correctness/noUnusedVariables: used in template ({columns})
const columns = [
  {
    key: 'title',
    label: 'Title',
    sortable: true,
    render: (v: unknown) => (v ? String(v) : '—'),
  },
  { key: 'folderId', label: 'Folder', render: (v: unknown) => (v ? String(v).slice(0, 8) : '—') },
  { key: 'ownerId', label: 'Owner', render: (v: unknown) => (v ? String(v).slice(0, 8) : '—') },
  { key: 'updatedAt', label: 'Last edited', sortable: true, render: formatShort },
];

// biome-ignore lint/correctness/noUnusedVariables: used in template (tabs={docsTabs})
const docsTabs = [
  { value: 'browse', label: 'Browse', href: '/documents' },
  { value: 'search', label: 'Search', href: '/documents/search' },
  { value: 'recent', label: 'Recent', href: '/documents/recent' },
];
</script>

<ModuleLayout
  title="Documents"
  description="Recent — hiai-docs backend"
  path="/documents/recent"
  tabs={docsTabs}
  activeTab="recent"
  error={data.error}
>
  <DataTable
    data={records}
    {columns}
    searchPlaceholder="Search recent documents..."
    emptyMessage="No recent documents"
  />
</ModuleLayout>
