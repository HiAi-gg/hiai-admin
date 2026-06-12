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
      'products',
      'orders',
      'payments',
      'promotions',
      'shipments',
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

function formatPrice(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  const display = n >= 1000 ? n / 100 : n;
  return `$${display.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShort(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
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
        if (v.includes('T')) return formatShort(v);
        return v.length > 80 ? `${v.slice(0, 80)}…` : v;
      }
      return String(v);
    },
  }));
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
const tableColumns =
  section === 'products'
    ? [
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          render: (v: unknown) => (v ? String(v) : '—'),
        },
        { key: 'price', label: 'Price', sortable: true, render: formatPrice },
        { key: 'status', label: 'Status', render: (v: unknown) => (v ? String(v) : 'unknown') },
        {
          key: 'inventory',
          label: 'Stock',
          render: (v: unknown) => {
            if (v === null || v === undefined || v === '') return '—';
            const n = Number(v);
            return Number.isNaN(n) ? '—' : n.toString();
          },
        },
      ]
    : section === 'orders'
      ? [
          {
            key: 'orderNumber',
            label: 'Order #',
            sortable: true,
            render: (v: unknown) => (v ? String(v) : '—'),
          },
          { key: 'customer', label: 'Customer', render: (v: unknown) => (v ? String(v) : '—') },
          { key: 'total', label: 'Total', sortable: true, render: formatPrice },
          { key: 'status', label: 'Status', render: (v: unknown) => (v ? String(v) : '—') },
          { key: 'createdAt', label: 'Date', sortable: true, render: formatShort },
        ]
      : section === 'payments'
        ? [
            { key: 'id', label: 'ID', render: (v: unknown) => (v ? String(v).slice(0, 8) : '—') },
            { key: 'method', label: 'Method', render: (v: unknown) => (v ? String(v) : '—') },
            { key: 'amount', label: 'Amount', sortable: true, render: formatPrice },
            { key: 'status', label: 'Status', render: (v: unknown) => (v ? String(v) : '—') },
          ]
        : genericColumns(records);

// biome-ignore lint/correctness/noUnusedVariables: used in template
const emptyMessage = `No ${sectionLabel(section).toLowerCase()} found`;
</script>

<svelte:head>
  <title>{sectionLabel(section)} — Shop — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold capitalize">{sectionLabel(section)}</h1>
      <p class="text-sm text-muted-foreground">E-Commerce · hiai-store backend</p>
    </div>
    <span class="text-xs text-muted-foreground font-mono">/shop/{rawPath}</span>
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
