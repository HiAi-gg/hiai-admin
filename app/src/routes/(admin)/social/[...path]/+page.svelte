<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template
import DataTable from '$lib/components/DataTable.svelte';

let { data } = $props();

const rawPath: string = (data.title as string) || 'dashboard';
const section = rawPath.split('/')[0] || 'dashboard';

function extractArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of [
      'items',
      'data',
      'results',
      'posts',
      'accounts',
      'campaigns',
      'templates',
      'content_plans',
    ]) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
    }
  }
  return [];
}

const records = extractArray(data.data);

function sectionLabel(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function formatShort(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function truncate(v: unknown, max = 80): string {
  const s = v ? String(v) : '';
  return s.length > max ? `${s.slice(0, max)}…` : s || '—';
}

function genericColumns(items: Record<string, unknown>[]) {
  if (items.length === 0) return [];
  const preferred = ['id', 'name', 'title', 'status', 'createdAt', 'updatedAt'];
  const keys = new Set<string>();
  for (const k of preferred) if (k in items[0]) keys.add(k);
  for (const k of Object.keys(items[0])) {
    if (keys.size >= 6) break;
    if (!keys.has(k)) keys.add(k);
  }
  return Array.from(keys).map((key) => ({
    key,
    label: sectionLabel(key),
    sortable: key !== 'id',
    render: (v: unknown) => {
      if (v === null || v === undefined || v === '') return '—';
      if (typeof v === 'object') return JSON.stringify(v);
      if (typeof v === 'string') {
        if (v.includes('T')) return formatDate(v);
        return truncate(v);
      }
      return String(v);
    },
  }));
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
const tableColumns =
  section === 'posts'
    ? [
        {
          key: 'platform',
          label: 'Platform',
          sortable: true,
          render: (v: unknown) => (v ? String(v) : '—'),
        },
        { key: 'content', label: 'Content', render: (v: unknown) => truncate(v) },
        { key: 'status', label: 'Status', render: (v: unknown) => (v ? String(v) : 'draft') },
        { key: 'scheduledAt', label: 'Scheduled', sortable: true, render: formatDate },
        { key: 'createdAt', label: 'Created', sortable: true, render: formatShort },
      ]
    : section === 'accounts'
      ? [
          {
            key: 'platform',
            label: 'Platform',
            sortable: true,
            render: (v: unknown) => (v ? String(v) : '—'),
          },
          { key: 'handle', label: 'Handle', render: (v: unknown) => (v ? `@${String(v)}` : '—') },
          { key: 'status', label: 'Status', render: (v: unknown) => (v ? String(v) : 'unknown') },
          { key: 'connectedAt', label: 'Connected', sortable: true, render: formatShort },
        ]
      : section === 'campaigns'
        ? [
            {
              key: 'name',
              label: 'Name',
              sortable: true,
              render: (v: unknown) => (v ? String(v) : '—'),
            },
            { key: 'status', label: 'Status', render: (v: unknown) => (v ? String(v) : '—') },
            { key: 'startDate', label: 'Start', render: formatShort },
            { key: 'endDate', label: 'End', render: formatShort },
          ]
        : genericColumns(records);

// biome-ignore lint/correctness/noUnusedVariables: used in template
const emptyMessage = `No ${sectionLabel(section).toLowerCase()} found`;
</script>

<svelte:head>
  <title>{sectionLabel(section)} — Social — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold capitalize">{sectionLabel(section)}</h1>
      <p class="text-sm text-muted-foreground">Social Media · hiai-post backend</p>
    </div>
    <span class="text-xs text-muted-foreground font-mono">/social/{rawPath}</span>
  </div>

  {#if data.error}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {data.error}
    </div>
  {:else}
    <DataTable
      data={records}
      columns={tableColumns}
      searchPlaceholder={`Search ${section}...`}
      {emptyMessage}
    />
  {/if}
</div>
